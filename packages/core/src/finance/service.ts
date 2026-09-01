import { logger, logSyncJob } from "@prabu-life-os/shared";
import { getOutlookGraphClient } from "../outlook/service";
import {
  getExistingTransferIds,
  createTransactionsBatch,
  queryTransactionsFromNotion,
  updateTransactionsBatch,
} from "../notion/client";
import { parseWiseEmail, getHistoricalFirstPayment } from "./parser";
import {
  buildNotionInputFromTransfer,
  extractTransferIdFromText,
  mapNotionPageToTransfer,
  needsNotionRepair,
} from "./mapper";
import type {
  WiseTransfer,
  SyncSalaryOptions,
  SyncSalaryResult,
  IncomeSummary,
  MonthlyBreakdown,
  RepairNotionOptions,
  RepairNotionResult,
} from "./types";

export async function fetchSalaryTransfers(
  options: { count?: number; since?: string } = {}
): Promise<WiseTransfer[]> {
  const client = await getOutlookGraphClient();
  const transfers: WiseTransfer[] = [];
  const seenTransferNumbers = new Set<string>();

  const initialPayment = getHistoricalFirstPayment();
  if (initialPayment.transferNumber) {
    seenTransferNumbers.add(initialPayment.transferNumber);
  }
  transfers.push(initialPayment);

  const queries = ['"Wise"', '"Transfer sent"', '"Your money\'s been sent"'];
  const processedMessageIds = new Set<string>();

  for (const query of queries) {
    let url: string | undefined = `/me/messages?$search=${query}&$top=50&$select=id,subject,from,receivedDateTime,bodyPreview,body`;

    while (url) {
      try {
        const res = await client.api(url).get();
        const messages = res.value || [];

        for (const m of messages) {
          if (processedMessageIds.has(m.id)) continue;
          processedMessageIds.add(m.id);

          const fromAddr = m.from?.emailAddress?.address?.toLowerCase();
          if (fromAddr !== "brbangalore@blueoceansp.ai") continue;

          const parsed = parseWiseEmail(m);
          if (!parsed) continue;

          if (parsed.transferNumber) {
            if (seenTransferNumbers.has(parsed.transferNumber)) {
              continue;
            }
            seenTransferNumbers.add(parsed.transferNumber);
          }

          transfers.push(parsed);
        }

        url = res["@odata.nextLink"];
      } catch (err) {
        logger.warn(`Outlook search failed for query "${query}": ${(err as Error).message}`);
        break;
      }
    }
  }

  let filtered = transfers;
  if (options.since) {
    filtered = filtered.filter((t) => t.date >= options.since!);
  }

  filtered.sort((a, b) => a.date.localeCompare(b.date));

  if (options.count && options.count > 0) {
    filtered = filtered.slice(0, options.count);
  }

  return filtered;
}

export async function syncSalaryToNotion(
  options: SyncSalaryOptions = {}
): Promise<SyncSalaryResult> {
  const allTransfers = await fetchSalaryTransfers({
    count: options.count,
    since: options.since,
  });

  const dryRun = options.dryRun !== false;
  let existingTransferIds = new Set<string>();
  const errors: string[] = [];

  const notionToken = process.env.NOTION_TOKEN;

  if (notionToken) {
    try {
      existingTransferIds = await getExistingTransferIds();
    } catch (err) {
      const message = `Could not query Notion existing items: ${(err as Error).message}`;
      errors.push(message);
      logger.warn(message);
    }
  } else if (!dryRun) {
    throw new Error(
      "Cannot sync to Notion: NOTION_TOKEN is not set in environment or .env file."
    );
  }

  const newTransfers = options.force
    ? allTransfers
    : allTransfers.filter(
        (t) => !t.transferNumber || !existingTransferIds.has(t.transferNumber)
      );

  const skippedCount = allTransfers.length - newTransfers.length;
  let insertedCount = 0;

  if (!dryRun && newTransfers.length > 0) {
    const batchInput = newTransfers.map(buildNotionInputFromTransfer);
    const result = await createTransactionsBatch(batchInput);
    insertedCount = result.success;
    if (result.errors.length > 0) {
      errors.push(...result.errors);
    }
  }

  const result = {
    totalFound: allTransfers.length,
    newTransfers: newTransfers.length,
    skippedCount,
    insertedCount,
    errors,
    items: newTransfers,
    dryRun,
  };

  if (!dryRun) {
    const status = errors.length > 0 ? "error" : "success";
    const message =
      errors.length > 0
        ? errors.join("; ")
        : `inserted=${insertedCount}, skipped=${skippedCount}`;
    await logSyncJob("sync_salary_to_notion", status, message, insertedCount);
  }

  return result;
}

function buildCanonicalTransferMap(
  transfers: WiseTransfer[]
): Map<string, WiseTransfer> {
  const map = new Map<string, WiseTransfer>();

  for (const transfer of transfers) {
    if (transfer.transferNumber) {
      map.set(transfer.transferNumber, transfer);
    }
  }

  return map;
}

function findCanonicalTransfer(
  page: { name: string; notes?: string; transferId?: string; date?: string },
  canonicalById: Map<string, WiseTransfer>
): WiseTransfer | undefined {
  const transferId = extractTransferIdFromText(
    page.name,
    page.notes,
    page.transferId
  );

  if (transferId && canonicalById.has(transferId)) {
    return canonicalById.get(transferId);
  }

  if (page.date === "2025-08-04" || /first payment/i.test(page.name)) {
    return canonicalById.get("20250804");
  }

  return undefined;
}

export async function repairNotionTransactions(
  options: RepairNotionOptions = {}
): Promise<RepairNotionResult> {
  const dryRun = options.dryRun !== false;
  const errors: string[] = [];

  const canonicalTransfers = await fetchSalaryTransfers();
  const canonicalById = buildCanonicalTransferMap(canonicalTransfers);
  const pages = await queryTransactionsFromNotion();

  const updates: Array<{
    pageId: string;
    data: ReturnType<typeof buildNotionInputFromTransfer>;
  }> = [];

  let matchedPages = 0;

  for (const page of pages) {
    const canonical = findCanonicalTransfer(page, canonicalById);
    if (!canonical) {
      logger.warn(`No canonical transfer match for Notion page: ${page.name}`);
      continue;
    }

    matchedPages++;

    if (!needsNotionRepair(page, canonical)) {
      continue;
    }

    updates.push({
      pageId: page.id,
      data: buildNotionInputFromTransfer(canonical),
    });
  }

  let repairedCount = 0;

  if (!dryRun && updates.length > 0) {
    const result = await updateTransactionsBatch(updates);
    repairedCount = result.success;
    if (result.errors.length > 0) {
      errors.push(...result.errors);
    }
  } else {
    repairedCount = updates.length;
  }

  return {
    totalPages: pages.length,
    matchedPages,
    repairedCount,
    skippedCount: pages.length - matchedPages,
    dryRun,
    errors,
  };
}

function summarizeTransfers(
  transfers: WiseTransfer[],
  options: { fromDate?: string; toDate?: string } = {}
): IncomeSummary {
  let filtered = transfers;

  if (options.fromDate) {
    filtered = filtered.filter((t) => t.date >= options.fromDate!);
  }
  if (options.toDate) {
    filtered = filtered.filter((t) => t.date <= options.toDate!);
  }

  filtered.sort((a, b) => a.date.localeCompare(b.date));

  let totalUsd = 0;
  let totalLkr = 0;
  let salaryCount = 0;
  let bonusCount = 0;

  const monthlyMap = new Map<string, { usd: number; lkr: number; count: number }>();

  for (const t of filtered) {
    totalUsd += t.amount || 0;
    totalLkr += t.amountLkr || 0;

    if (t.category === "Bonus") {
      bonusCount++;
    } else {
      salaryCount++;
    }

    const month = t.date.slice(0, 7);
    if (month) {
      const current = monthlyMap.get(month) || { usd: 0, lkr: 0, count: 0 };
      current.usd += t.amount || 0;
      current.lkr += t.amountLkr || 0;
      current.count += 1;
      monthlyMap.set(month, current);
    }
  }

  const monthlyBreakdown: MonthlyBreakdown[] = Array.from(
    monthlyMap.entries()
  ).map(([month, data]) => ({
    month,
    usd: Math.round(data.usd * 100) / 100,
    lkr: Math.round(data.lkr * 100) / 100,
    count: data.count,
  }));

  return {
    totalUsd: Math.round(totalUsd * 100) / 100,
    totalLkr: Math.round(totalLkr * 100) / 100,
    transferCount: filtered.length,
    salaryCount,
    bonusCount,
    firstTransferDate: filtered.length > 0 ? filtered[0].date : undefined,
    lastTransferDate:
      filtered.length > 0 ? filtered[filtered.length - 1].date : undefined,
    monthlyBreakdown,
  };
}

export async function getIncomeSummary(
  options: { fromDate?: string; toDate?: string } = {}
): Promise<IncomeSummary> {
  let transfers: WiseTransfer[] = [];

  if (process.env.NOTION_TOKEN) {
    try {
      const notionPages = await queryTransactionsFromNotion();
      transfers = notionPages
        .filter((p) => p.type === "Income")
        .map(mapNotionPageToTransfer);
    } catch (err) {
      logger.warn(
        `Notion income summary failed, falling back to Outlook: ${(err as Error).message}`
      );
      transfers = await fetchSalaryTransfers();
    }
  }

  if (transfers.length === 0) {
    transfers = await fetchSalaryTransfers();
  }

  return summarizeTransfers(transfers, options);
}

export async function getMonthlyIncomeSummary(
  options: { fromDate?: string; toDate?: string } = {}
): Promise<MonthlyBreakdown[]> {
  const summary = await getIncomeSummary(options);
  return summary.monthlyBreakdown;
}
