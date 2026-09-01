import { getPool, isDatabaseConfigured } from "@prabu-life-os/shared";
import type { FinancialTransaction } from "./types";

const memoryStore: FinancialTransaction[] = [];

function rowToTransaction(row: Record<string, unknown>): FinancialTransaction {
  return {
    id: String(row.id),
    externalId: row.external_id ? String(row.external_id) : undefined,
    date: String(row.date).slice(0, 10),
    amountLkr: Number(row.amount_lkr),
    amountUsd: row.amount_usd != null ? Number(row.amount_usd) : undefined,
    direction: row.direction as "credit" | "debit",
    transactionType: row.transaction_type as FinancialTransaction["transactionType"],
    category: row.category ? String(row.category) : undefined,
    description: String(row.description),
    source: row.source as FinancialTransaction["source"],
    accountId: row.account_id ? String(row.account_id) : undefined,
    counterparty: row.counterparty ? String(row.counterparty) : undefined,
    feeLkr: row.fee_lkr != null ? Number(row.fee_lkr) : undefined,
    metadata: (row.metadata as Record<string, unknown>) || {},
  };
}

export async function saveTransactions(
  transactions: FinancialTransaction[]
): Promise<{ inserted: number; skipped: number; insertedTransactions: FinancialTransaction[] }> {
  let inserted = 0;
  let skipped = 0;
  const insertedTransactions: FinancialTransaction[] = [];

  for (const tx of transactions) {
    const exists = await transactionExists(tx.externalId);
    if (exists) {
      skipped++;
      continue;
    }

    if (isDatabaseConfigured()) {
      await getPool().query(
        `INSERT INTO financial_transactions
          (external_id, date, amount_lkr, amount_usd, direction, transaction_type,
           category, description, source, account_id, counterparty, fee_lkr, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (external_id) DO NOTHING`,
        [
          tx.externalId ?? null,
          tx.date,
          tx.amountLkr,
          tx.amountUsd ?? null,
          tx.direction,
          tx.transactionType,
          tx.category ?? null,
          tx.description,
          tx.source,
          tx.accountId ?? null,
          tx.counterparty ?? null,
          tx.feeLkr ?? 0,
          JSON.stringify(tx.metadata ?? {}),
        ]
      );
    } else {
      memoryStore.push(tx);
    }
    inserted++;
    insertedTransactions.push(tx);
  }

  return { inserted, skipped, insertedTransactions };
}

async function transactionExists(externalId?: string): Promise<boolean> {
  if (!externalId) return false;

  if (isDatabaseConfigured()) {
    const res = await getPool().query(
      `SELECT 1 FROM financial_transactions WHERE external_id = $1 LIMIT 1`,
      [externalId]
    );
    return res.rows.length > 0;
  }

  return memoryStore.some((tx) => tx.externalId === externalId);
}

export async function listTransactions(options: {
  fromDate?: string;
  toDate?: string;
  limit?: number;
} = {}): Promise<FinancialTransaction[]> {
  if (isDatabaseConfigured()) {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (options.fromDate) {
      params.push(options.fromDate);
      clauses.push(`date >= $${params.length}`);
    }
    if (options.toDate) {
      params.push(options.toDate);
      clauses.push(`date <= $${params.length}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    params.push(options.limit ?? 500);
    const res = await getPool().query(
      `SELECT * FROM financial_transactions ${where}
       ORDER BY date DESC, id DESC
       LIMIT $${params.length}`,
      params
    );
    return res.rows.map(rowToTransaction);
  }

  let items = [...memoryStore];
  if (options.fromDate) items = items.filter((t) => t.date >= options.fromDate!);
  if (options.toDate) items = items.filter((t) => t.date <= options.toDate!);
  items.sort((a, b) => b.date.localeCompare(a.date));
  return items.slice(0, options.limit ?? 500);
}

export function clearMemoryStoreForTests(): void {
  memoryStore.length = 0;
}
