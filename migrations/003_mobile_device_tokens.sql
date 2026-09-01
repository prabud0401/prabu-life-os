-- Migration 003: Mobile Device Tokens for Push Notifications
-- Run in Railway Postgres Console after 002_financial_transactions.sql

CREATE TABLE IF NOT EXISTS mobile_device_tokens (
  id              SERIAL PRIMARY KEY,
  device_token    TEXT NOT NULL UNIQUE,
  platform        TEXT, -- 'ios' | 'android' | 'web'
  device_name     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mobile_device_tokens_token
  ON mobile_device_tokens (device_token);
