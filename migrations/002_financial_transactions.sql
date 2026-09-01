-- Financial Intelligence Engine — normalized transaction ledger
-- Run in Railway Postgres Console after 001_initial.sql

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
