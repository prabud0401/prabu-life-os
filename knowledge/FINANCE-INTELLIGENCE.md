# Financial Intelligence Engine

Separate agent module for Prabu's multi-account finance: classification, reconciliation, and scenario analysis (base / happy / worst).

**Spec source:** `Prabu Life OS — Financial Intelligence Engine Architecture & System Specification.pdf`

## Architecture

```
Data Sources                    Finance Engine                    Outputs
─────────────                   ──────────────                    ───────
Gmail (People's Pay, bills)  ─┐
Outlook (Wise salary)        ─┼─► parsers → classifier → store ─► reconciliation report
SMS (Tasker / mobile)        ─┤                              ─► scenario analysis
Manual / mobile API        ─┘                              ─► Notion (future)
```

## Registered accounts

People's Bank (savings, wallet, credit card), HNB, BOC, Commercial Bank, Wise USD salary — see `list_registered_accounts` MCP tool.

## Classification rules

| Rule | Type | Net worth impact |
|------|------|------------------|
| Inter-account self-transfer | `INTERNAL_TRANSFER` | Net zero (fees → `BANKING_FEE`) |
| Broker client deposits | `BROKER_INWARD` | Excluded from personal spend |
| Broker disbursements | `BROKER_OUTWARD` | Excluded from personal spend |
| Utilities, subs, transport | `PERSONAL_LIVING_EXPENSE` | Counted as living cost |
| Card top-up from bank | `CARD_REPAYMENT` | Cash flow view only |

## MCP tools (Financial Intelligence Agent)

| Tool | Purpose |
|------|---------|
| `run_financial_reconciliation` | Full report + base/happy/worst scenarios |
| `ingest_sms_alert` | Parse bank SMS deposit |
| `ingest_finance_email` | Parse bill/card/transfer emails |
| `classify_transaction` | Classify a single transaction |
| `list_registered_accounts` | Account directory |

Use these tools in a **dedicated Gemini custom app** or Grok MCP session with the agent prompt in `knowledge/prompts/FINANCE-INTELLIGENCE-AGENT.md`.

## REST API (mobile / Tasker)

| Endpoint | Method | Auth |
|----------|--------|------|
| `/api/finance/intelligence/report` | GET | JWT or API key |
| `/api/finance/intelligence/ingest/sms` | POST | JWT or API key |
| `/api/finance/intelligence/ingest/email` | POST | JWT or API key |
| `/api/finance/intelligence/classify` | POST | JWT or API key |
| `/api/finance/intelligence/accounts` | GET | JWT or API key |

### Tasker webhook example

```
POST https://prabu-life-os-production.up.railway.app/api/finance/intelligence/ingest/sms
Authorization: Bearer YOUR_PRABU_MCP_API_KEY
Content-Type: application/json

{"sender":"PEOPLESBANK","text":"Your a/c credited with LKR 25,000.00"}
```

## Database

Run migration: `migrations/002_financial_transactions.sql`

```powershell
# Railway Postgres console, or:
node scripts/run-migration.js 002_financial_transactions.sql
```

## Data ingestion roadmap

| Source | Status | Method |
|--------|--------|--------|
| Wise salary (Outlook) | ✅ | Existing `sync_salary_to_notion` + engine merges Notion totals |
| Gmail bank emails | ✅ | `ingest_finance_email` + Gmail MCP search |
| SMS alerts | ✅ | Tasker → `/ingest/sms` |
| HNB/BOC PDF statements | 🔜 | PDF parser + Drive batch |
| Mobile app | 🔜 | Phase 5 REST client |

## Gmail re-auth reminder

Cloud Gmail tools need a valid refresh token:

```powershell
cd D:\tools\gmail-mcp-server && npm run auth
cd C:\Users\prabu\Desktop\prabu-life-os && npm run auth:gmail:bridge
```
