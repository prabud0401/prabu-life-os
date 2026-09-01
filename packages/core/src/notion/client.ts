import { logger } from "@prabu-life-os/shared";
import { getNotionConfig } from "./config";
import type {
  NotionTransactionInput,
  NotionTransactionUpdate,
  NotionPageSummary,
} from "./types";

const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

function getHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

function readRichText(property: any): string {
  return (
    property?.rich_text?.map((t: any) => t.plain_text).join("") ||
    property?.title?.map((t: any) => t.plain_text).join("") ||
    ""
  );
}

function parsePageSummary(page: any): NotionPageSummary {
  const name = readRichText(page.properties?.Name) || readRichText(page.properties?.title);
  const notes = readRichText(page.properties?.Notes);
  const transferId = readRichText(page.properties?.["Transfer ID"]);

  const transferMatch =
    transferId ||
    name.match(/#([0-9]+)/)?.[1] ||
    notes.match(/#([0-9]+)/)?.[1];

  return {
    id: page.id,
    name,
    date: page.properties?.Date?.date?.start,
    amount: page.properties?.Amount?.number ?? undefined,
    currency: page.properties?.Currency?.select?.name,
    type: page.properties?.Type?.select?.name,
    category: page.properties?.Category?.select?.name,
    source: page.properties?.Source?.select?.name,
    notes,
    transferId: transferMatch || undefined,
    amountLkr: page.properties?.["Amount LKR"]?.number ?? undefined,
  };
}

function buildProperties(
  tx: NotionTransactionInput | NotionTransactionUpdate
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};

  if (tx.name !== undefined) {
    properties.Name = { title: [{ text: { content: tx.name } }] };
  }
  if (tx.type !== undefined) {
    properties.Type = { select: { name: tx.type } };
  }
  if (tx.category !== undefined) {
    properties.Category = { select: { name: tx.category } };
  }
  if (tx.source !== undefined) {
    properties.Source = { select: { name: tx.source } };
  }
  if (tx.amount !== undefined) {
    properties.Amount = { number: tx.amount };
  }
  if (tx.currency !== undefined) {
    properties.Currency = { select: { name: tx.currency } };
  }
  if (tx.notes !== undefined) {
    properties.Notes = { rich_text: [{ text: { content: tx.notes } }] };
  }
  if (tx.transferId !== undefined) {
    properties["Transfer ID"] = {
      rich_text: [{ text: { content: tx.transferId } }],
    };
  }
  if (tx.amountLkr !== undefined) {
    properties["Amount LKR"] = { number: tx.amountLkr };
  }

  return properties;
}

function toCreateProperties(tx: NotionTransactionInput): Record<string, unknown> {
  const properties = buildProperties(tx);

  if (tx.date) {
    properties.Date = { date: { start: tx.date } };
    delete (properties as any).Date?.start;
  }

  return properties;
}

function toUpdateProperties(tx: NotionTransactionUpdate): Record<string, unknown> {
  const properties = buildProperties(tx);

  if (tx.date !== undefined) {
    properties.Date = { date: { start: tx.date } };
    delete (properties as any).Date?.start;
  }

  return properties;
}

export async function queryTransactionsFromNotion(): Promise<NotionPageSummary[]> {
  const config = getNotionConfig();
  if (!config.token) {
    throw new Error(
      "NOTION_TOKEN is not set. Please add NOTION_TOKEN to your .env file."
    );
  }

  const results: NotionPageSummary[] = [];
  let hasMore = true;
  let cursor: string | undefined = undefined;

  while (hasMore) {
    const res = await fetch(`${NOTION_API_BASE}/databases/${config.databaseId}/query`, {
      method: "POST",
      headers: getHeaders(config.token),
      body: JSON.stringify({
        page_size: 100,
        start_cursor: cursor,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Notion query failed (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as any;
    const pages = data.results || [];

    for (const page of pages) {
      results.push(parsePageSummary(page));
    }

    hasMore = Boolean(data.has_more);
    cursor = data.next_cursor || undefined;
  }

  return results;
}

export async function getExistingTransferIds(): Promise<Set<string>> {
  const existing = await queryTransactionsFromNotion();
  const ids = new Set<string>();

  for (const item of existing) {
    if (item.transferId) {
      ids.add(item.transferId);
    }
    if (item.date === "2025-08-04" || /first payment/i.test(item.name)) {
      ids.add("20250804");
    }
  }

  return ids;
}

export async function createTransactionInNotion(
  tx: NotionTransactionInput
): Promise<{ id: string; url: string }> {
  const config = getNotionConfig();
  if (!config.token) {
    throw new Error(
      "NOTION_TOKEN is not set. Please add NOTION_TOKEN to your .env file."
    );
  }

  const res = await fetch(`${NOTION_API_BASE}/pages`, {
    method: "POST",
    headers: getHeaders(config.token),
    body: JSON.stringify({
      parent: { database_id: config.databaseId },
      properties: toCreateProperties(tx),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create Notion page (${res.status}): ${errText}`);
  }

  const created = (await res.json()) as any;
  return { id: created.id, url: created.url };
}

export async function updateTransactionInNotion(
  pageId: string,
  tx: NotionTransactionUpdate
): Promise<{ id: string; url: string }> {
  const config = getNotionConfig();
  if (!config.token) {
    throw new Error(
      "NOTION_TOKEN is not set. Please add NOTION_TOKEN to your .env file."
    );
  }

  const properties = toUpdateProperties(tx);
  if (Object.keys(properties).length === 0) {
    throw new Error("No properties provided for Notion update.");
  }

  const res = await fetch(`${NOTION_API_BASE}/pages/${pageId}`, {
    method: "PATCH",
    headers: getHeaders(config.token),
    body: JSON.stringify({ properties }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to update Notion page (${res.status}): ${errText}`);
  }

  const updated = (await res.json()) as any;
  return { id: updated.id, url: updated.url };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function createTransactionsBatch(
  transactions: NotionTransactionInput[],
  onProgress?: (index: number, total: number, item: NotionTransactionInput) => void
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    try {
      if (onProgress) {
        onProgress(i + 1, transactions.length, tx);
      }
      await createTransactionInNotion(tx);
      success++;
    } catch (err) {
      failed++;
      const message = `[${tx.name}] ${(err as Error).message}`;
      errors.push(message);
      logger.error(message);
    }

    if (i < transactions.length - 1) {
      await sleep(350);
    }
  }

  return { success, failed, errors };
}

export async function updateTransactionsBatch(
  updates: Array<{ pageId: string; data: NotionTransactionUpdate }>,
  onProgress?: (index: number, total: number, pageId: string) => void
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < updates.length; i++) {
    const { pageId, data } = updates[i];
    try {
      if (onProgress) {
        onProgress(i + 1, updates.length, pageId);
      }
      await updateTransactionInNotion(pageId, data);
      success++;
    } catch (err) {
      failed++;
      const message = `[${pageId}] ${(err as Error).message}`;
      errors.push(message);
      logger.error(message);
    }

    if (i < updates.length - 1) {
      await sleep(350);
    }
  }

  return { success, failed, errors };
}
