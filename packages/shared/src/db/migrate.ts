import { getPool, isDatabaseConfigured } from "./pool";
import { logger } from "../utils/logger";

const FINANCIAL_TRANSACTIONS_SQL = `
CREATE TABLE IF NOT EXISTS financial_transactions (
  id              SERIAL PRIMARY KEY,
  external_id     TEXT UNIQUE,
  date            DATE NOT NULL,
  amount_lkr      NUMERIC(14, 2) NOT NULL,
  amount_usd      NUMERIC(14, 2),
  direction       TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
  transaction_type TEXT NOT NULL,
  category        TEXT,
  description     TEXT,
  source          TEXT NOT NULL,
  account_id      TEXT,
  counterparty    TEXT,
  fee_lkr         NUMERIC(14, 2) DEFAULT 0,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_date
  ON financial_transactions (date DESC);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_type
  ON financial_transactions (transaction_type);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_source
  ON financial_transactions (source);
`;

export async function ensureFinancialTransactionsTable(): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  try {
    await getPool().query(FINANCIAL_TRANSACTIONS_SQL);
    return true;
  } catch (err) {
    logger.warn(`Financial transactions migration failed: ${(err as Error).message}`);
    return false;
  }
}

export async function hasFinancialTransactionsTable(): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  try {
    const res = await getPool().query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'financial_transactions'
       LIMIT 1`
    );
    return res.rows.length > 0;
  } catch {
    return false;
  }
}
