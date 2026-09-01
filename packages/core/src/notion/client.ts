import { getNotionConfig } from "./config";
import type { NotionTransactionInput, NotionPageSummary } from "./types";

const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

function getHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
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

    for (const p of pages) {
      const name =
        p.properties?.Name?.title?.[0]?.plain_text ||
        p.properties?.title?.title?.[0]?.plain_text ||
        "";
      const notes =
        p.properties?.Notes?.rich_text?.map((t: any) => t.plain_text).join("") ||
        "";
      const date = p.properties?.Date?.date?.start;
      const amount = p.properties?.Amount?.number;
      const currency = p.properties?.Currency?.select?.name;
      const type = p.properties?.Type?.select?.name;
      const category = p.properties?.Category?.select?.name;
      const source = p.properties?.Source?.select?.name;

      const transferMatch =
        name.match(/#([0-9]+)/) || notes.match(/#([0-9]+)/);
      const transferId = transferMatch ? transferMatch[1] : undefined;

      results.push({
        id: p.id,
        name,
        date,
        amount,
        currency,
        type,
        category,
        source,
        notes,
        transferId,
      });
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

  const properties: Record<string, unknown> = {
    Name: {
      title: [{ text: { content: tx.name } }],
    },
    Type: {
      select: { name: tx.type },
    },
    Category: {
      select: { name: tx.category },
    },
    Source: {
      select: { name: tx.source },
    },
    Amount: {
      number: tx.amount,
    },
    Currency: {
      select: { name: tx.currency },
    },
  };

  if (tx.date) {
    properties.Date = {
      date: { start: tx.date },
    };
  }

  if (tx.notes) {
    properties.Notes = {
      rich_text: [{ text: { content: tx.notes } }],
    };
  }

  const res = await fetch(`${NOTION_API_BASE}/pages`, {
    method: "POST",
    headers: getHeaders(config.token),
    body: JSON.stringify({
      parent: { database_id: config.databaseId },
      properties,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create Notion page (${res.status}): ${errText}`);
  }

  const created = (await res.json()) as any;
  return { id: created.id, url: created.url };
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
      errors.push(`[${tx.name}] ${(err as Error).message}`);
    }

    // Rate limiting: sleep 350ms between inserts
    if (i < transactions.length - 1) {
      await sleep(350);
    }
  }

  return { success, failed, errors };
}
