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
| `ingest_bank_statement_pdf` | Parse encrypted/plain HNB/BOC statement PDF (HNB: 028020612034, BOC: 7861) |
| `classify_transaction` | Classify a single transaction |
| `list_registered_accounts` | Account directory |
| `sync_finance_emails_from_gmail` | Batch sync finance emails from Gmail |
| `sync_finance_emails_from_outlook` | Batch sync finance emails from Outlook |

Use these tools in a **dedicated Gemini custom app** or Grok MCP session with the agent prompt in `knowledge/prompts/FINANCE-INTELLIGENCE-AGENT.md`.

## REST API (mobile / Tasker)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/finance/intelligence/report` | GET | JWT or API key | Reconciliation report + scenarios |
| `/api/finance/intelligence/ingest/sms` | POST | JWT or API key | Tasker SMS alert target |
| `/api/finance/intelligence/ingest/email` | POST | JWT or API key | Email transaction ingest |
| `/api/finance/intelligence/ingest/pdf` | POST | JWT or API key | Base64 / raw PDF statement ingest |
| `/api/finance/intelligence/classify` | POST | JWT or API key | Classify description + amounts |
| `/api/finance/intelligence/accounts` | GET | JWT or API key | Directory of registered accounts |
| `/api/finance/intelligence/sync/gmail` | POST | JWT or API key | Batch Gmail finance sync |
| `/api/finance/intelligence/sync/outlook` | POST | JWT or API key | Batch Outlook finance sync |
| `/api/finance/intelligence/notify` | POST | JWT or API key | Push notification dispatcher |
| `/api/finance/intelligence/devices/register` | POST | JWT or API key | Register Expo push token |
| `/api/finance/intelligence/devices/unregister` | POST | JWT or API key | Remove Expo push token |

### Tasker webhook example

```
POST https://prabu-life-os-production.up.railway.app/api/finance/intelligence/ingest/sms
Authorization: Bearer YOUR_PRABU_MCP_API_KEY
Content-Type: application/json

{"sender":"PEOPLESBANK","text":"Your a/c credited with LKR 25,000.00"}
```

## Database

Run migrations in order:
1. `migrations/001_initial.sql` (OAuth tokens & sync log)
2. `migrations/002_financial_transactions.sql` (Ledger table)
3. `migrations/003_mobile_device_tokens.sql` (Expo push device tokens)

## Data ingestion roadmap

| Source | Status | Method |
|--------|--------|--------|
| Wise salary (Outlook) | ✅ | Existing `sync_salary_to_notion` + engine merges Notion totals |
| Gmail bank emails | ✅ | `ingest_finance_email` + `sync_finance_emails_from_gmail` |
| Outlook bank emails | ✅ | `sync_finance_emails_from_outlook` |
| SMS alerts | ✅ | Tasker → `/ingest/sms` |
| HNB/BOC PDF statements | ✅ | PDF parser (`pdf.ts`) + `ingest_bank_statement_pdf` |
| Mobile push alerts | ✅ | Expo Push API + `/notify` + automatic triggers |
| Mobile app | 🔜 | Phase 5 REST client |

## Gmail re-auth reminder

Cloud Gmail tools need a valid refresh token:

```powershell
cd D:\tools\gmail-mcp-server && npm run auth
cd C:\Users\prabu\Desktop\prabu-life-os && npm run auth:gmail:bridge
```
