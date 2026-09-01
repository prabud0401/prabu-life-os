-- prabu-life-os Phase 3 schema (idempotent)
-- Run in Railway Postgres Console if tables are missing.

CREATE TABLE IF NOT EXISTS oauth_tokens (
  id            SERIAL PRIMARY KEY,
  provider      TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  access_token  TEXT,
  refresh_token TEXT,
  expires_at    TIMESTAMPTZ,
  scope         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, user_id)
);

CREATE TABLE IF NOT EXISTS sync_log (
  id            SERIAL PRIMARY KEY,
  job_name      TEXT NOT NULL,
  status        TEXT NOT NULL,
  message       TEXT,
  rows_affected INT,
  ran_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oauth_tokens_provider_user
  ON oauth_tokens (provider, user_id);
