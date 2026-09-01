import { getOutlookGraphClient } from "../outlook/service";
import {
  getExistingTransferIds,
  createTransactionsBatch,
  queryTransactionsFromNotion,
} from "../notion/client";
import { parseWiseEmail, getHistoricalFirstPayment } from "./parser";
import type {
  WiseTransfer,
  SyncSalaryOptions,
  SyncSalaryResult,
  IncomeSummary,
  MonthlyBreakdown,
} from "./types";

export async function fetchSalaryTransfers(
  options: { count?: number; since?: string } = {}
): Promise<WiseTransfer[]> {
  const client = await getOutlookGraphClient();
  const transfers: WiseTransfer[] = [];
  const seenTransferNumbers = new Set<string>();

  // Include historical first payment (2025-08-04)
  const initialPayment = getHistoricalFirstPayment();
  if (initialPayment.transferNumber) {
    seenTransferNumbers.add(initialPayment.transferNumber);
  }
  transfers.push(initialPayment);

  // Search queries for Wise forwarded emails in Graph API
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
      } catch {
        break;
      }
    }
  }

  // Filter by since date if specified
  let filtered = transfers;
  if (options.since) {
    filtered = filtered.filter((t) => t.date >= options.since!);
  }

  // Sort chronologically ascending
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

  const dryRun = options.dryRun !== false; // Default to true if not explicitly false
  let existingTransferIds = new Set<string>();
  const errors: string[] = [];

  const notionToken = process.env.NOTION_TOKEN;

  if (notionToken) {
    try {
      existingTransferIds = await getExistingTransferIds();
    } catch (err) {
      errors.push(`Could not query Notion existing items: ${(err as Error).message}`);
    }
  } else if (!dryRun) {
    throw new Error(
      "Cannot sync to Notion: NOTION_TOKEN is not set in environment or .env file."
    );
  }

  // Filter transfers to only new ones (not in Notion)
  const newTransfers = options.force
    ? allTransfers
    : allTransfers.filter(
        (t) => !t.transferNumber || !existingTransferIds.has(t.transferNumber)
      );

  const skippedCount = allTransfers.length - newTransfers.length;
  let insertedCount = 0;

  if (!dryRun && newTransfers.length > 0) {
    const batchInput = newTransfers.map((t) => ({
      name: t.name,
      date: t.date,
      amount: t.amount,
      currency: "USD" as const,
      type: "Income" as const,
      category: t.category,
      source: "Outlook" as const,
      notes: t.notes,
    }));

    const result = await createTransactionsBatch(batchInput);
    insertedCount = result.success;
    if (result.errors.length > 0) {
      errors.push(...result.errors);
    }
  }

  return {
    totalFound: allTransfers.length,
    newTransfers: newTransfers.length,
    skippedCount,
    insertedCount,
    errors,
    items: newTransfers,
    dryRun,
  };
}

export async function getIncomeSummary(
  options: { fromDate?: string; toDate?: string } = {}
): Promise<IncomeSummary> {
  let transfers: WiseTransfer[] = [];

  // Try fetching from Notion first if token is available
  if (process.env.NOTION_TOKEN) {
    try {
      const notionPages = await queryTransactionsFromNotion();
      transfers = notionPages
        .filter((p) => p.type === "Income")
        .map((p) => {
          const lkrMatch = p.notes?.match(/LKR\s*([0-9,.]+)/i);
          const amountLkr =
            p.currency === "LKR"
              ? p.amount
              : lkrMatch
              ? parseFloat(lkrMatch[1].replace(/,/g, ""))
              : undefined;

          const rateMatch = p.notes?.match(/Rate:\s*1\s*USD\s*=\s*([0-9,.]+)\s*LKR/i);
          const rate = rateMatch ? parseFloat(rateMatch[1].replace(/,/g, "")) : undefined;

          let amountUsd = p.amount || 0;
          if (p.currency === "LKR" && p.amount && p.amount > 2000) {
            amountUsd = rate ? Math.round((p.amount / rate) * 100) / 100 : Math.round((p.amount / 303.02) * 100) / 100;
          }

          const resolvedLkr =
            amountLkr !== undefined
              ? amountLkr
              : rate
              ? Math.round(amountUsd * rate * 100) / 100
              : Math.round(amountUsd * 315 * 100) / 100;

          return {
            name: p.name,
            type: "Income" as const,
            category: (p.category as any) || "Salary",
            source: (p.source as any) || "Outlook",
            amount: amountUsd,
            currency: "USD" as const,
            amountLkr: resolvedLkr,
            rate,
            date: p.date || "",
            notes: p.notes || "",
            transferNumber: p.transferId,
          };
        });
    } catch {
      // Fallback to Outlook
      transfers = await fetchSalaryTransfers();
    }
  }

  if (transfers.length === 0) {
    transfers = await fetchSalaryTransfers();
  }

  if (options.fromDate) {
    transfers = transfers.filter((t) => t.date >= options.fromDate!);
  }
  if (options.toDate) {
    transfers = transfers.filter((t) => t.date <= options.toDate!);
  }

  transfers.sort((a, b) => a.date.localeCompare(b.date));

  let totalUsd = 0;
  let totalLkr = 0;
  let salaryCount = 0;
  let bonusCount = 0;

  const monthlyMap = new Map<string, { usd: number; lkr: number; count: number }>();

  for (const t of transfers) {
    totalUsd += t.amount || 0;
    totalLkr += t.amountLkr || 0;

    if (t.category === "Bonus") {
      bonusCount++;
    } else {
      salaryCount++;
    }

    const month = t.date.slice(0, 7); // YYYY-MM
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
    transferCount: transfers.length,
    salaryCount,
    bonusCount,
    firstTransferDate: transfers.length > 0 ? transfers[0].date : undefined,
    lastTransferDate:
      transfers.length > 0 ? transfers[transfers.length - 1].date : undefined,
    monthlyBreakdown,
  };
}
