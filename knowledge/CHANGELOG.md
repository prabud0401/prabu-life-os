# Changelog

All notable changes to this project. Format: date — summary — agent/tool.

---

## 2026-09-01
 
 - **Created** `prabu-life-os` repo on Desktop with full `knowledge/` hub
 - **Added** RULES, PLAN, STATUS, ARCHITECTURE, MCP-SETUP, NOTION, EMAIL-SOURCES, DECISIONS
 - **Added** Antigravity starter prompt in `knowledge/prompts/`
 - **Added** AGENTS.md, config templates, .gitignore
 - **Source**: Migrated context from `personal-finance` prototype and salary email analysis
 - **Created** GitHub repo https://github.com/prabud0401/prabu-life-os (private, pushed)
 - **Agent**: Cursor PM

- **Implemented** Phase 1.1–1.3: Monorepo scaffold (`packages/shared`, `packages/core`, `packages/mcp`)
  - Created `@prabu-life-os/shared` with MSAL auth, Key Vault secret client, OAuth2 client, MS Graph client factory, and logger
  - Created `@prabu-life-os/core` with pure business logic in `outlook/` (`listEmails`, `getEmail`, `searchEmails`, `listFolders`, `authenticateOutlook`) and stubs for `teams`, `gmail`, `finance`, and `notion`
  - Created `@prabu-life-os/mcp` server supporting stdio & SSE HTTP modes with tools: `list_emails`, `get_email`, `search_emails`, `list_folders`
  - Updated root npm workspaces and build scripts; verified `npm run build` passes cleanly
- **Committed**: `feat: scaffold monorepo with shared, core outlook, and mcp server` on `feature/phase-1-scaffold`
- **Implemented** Phase 1.6–1.7: Wise email parser, Notion client & sync, and MCP finance tools
  - Created `packages/core/src/notion`: REST client for querying existing transactions, deduplication by Transfer ID, and batch page creation matching the Transactions DB schema
  - Created `packages/core/src/finance`: robust parser for Wise "Transfer sent" and "Your money's been sent" emails, first payment integration (Aug 2025), and income summary aggregator
  - Created `packages/mcp/src/tools/finance.ts`: exposed `sync_salary_to_notion` and `get_income_summary` tools
  - Verified against 31 historical transfers in Outlook: parsed $8,490.73 USD / 2,648,425.18 LKR across 30 salary + 1 bonus transfer
  - Verified `npm run build` passes across all packages
- **Completed** Phase 1.10: Live Notion synchronization executed
  - Connected `prabudOS` integration to Notion Finance Hub & Transactions DB
  - Executed live sync: 27 new transfers added to Notion, 4 existing samples skipped via deduplication
  - Final Notion row count: 31 rows (100% deduplicated and synced)
  - Re-run test verified 0 duplicate inserts (all 31 skipped)
  - Income summary verified: $8,490.73 USD across 31 records
- **Branch**: `feature/phase-1-scaffold`
- **Agent**: Antigravity

- **Merged** Phase 1 to `main` via [PR #1](https://github.com/prabud0401/prabu-life-os/pull/1)
- **Completed** Phase 1.9: Grok MCP smoke test with folder trust
  - `prabu-life-os` MCP: 6 tools (outlook ×4 + finance ×2) — handshake OK
  - `outlook` MCP: 4 tools — handshake OK
  - `gmail-local` MCP: 9 tools — handshake OK
  - Added `prabu-life-os` server to `.grok/config.toml`
- **Agent**: Cursor PM

- **Completed** Phase 2: Notion polish, schema expansion, and data repair
  - Added Notion columns: `Transfer ID`, `Amount LKR`
  - Updated Notion client to read/write new fields + batch update support
  - Added `repairNotionTransactions()`, `getMonthlyIncomeSummary()`, finance mapper module
  - Repaired all 31 Notion rows: 0 wrong Currency, 0 missing Amount LKR
  - Verified totals from Notion: $8,490.73 USD / 2,648,425.18 LKR
  - Added parser unit tests (5 passing) and `scripts/repair-notion-rows.js`
- **Branch**: `feature/phase-2-polish` (merged via PR #2)
- **Agent**: Cursor PM

- **Implemented** Phase 3 (code): Railway + Postgres cloud scaffold
  - Postgres MSAL token cache when `DATABASE_URL` is set
  - HTTP MCP with API key auth on `/sse` and `/messages`
  - OAuth routes: `/auth/microsoft`, `/auth/microsoft/callback`, `/auth/status`
  - `Dockerfile`, `railway.toml`, `migrations/001_initial.sql`, `knowledge/RAILWAY.md`
- **Branch**: `feature/phase-3-railway`
- **Agent**: Cursor PM

- **Completed** Phase 3 Deploy & Bridge Auth: Live Railway deployment + Outlook token bridge
  - Implemented `POST /auth/microsoft/bridge` in `@prabu-life-os/mcp` and `upsertMsalTokenCache` in `@prabu-life-os/shared`
  - Created `scripts/auth-outlook-bridge.js` & `scripts/auth-outlook-bridge.ps1` with `npm run auth:outlook:bridge`
  - Streamable HTTP `/sse` and legacy `/sse/legacy` supported for Grok & remote clients
  - Live verified `https://prabu-life-os-production.up.railway.app/auth/status`: `"outlook": true`, `"database": true`
  - Tested `npm run build` and `npm test` (5/5 passing)
- **Branch**: `feature/phase-3-cloud-bridge`
- **Agent**: Antigravity

- **Implemented** Phase 4: REST API package & JWT authentication
  - Created `@prabu-life-os/api` workspace with Express REST routes:
    - `POST /api/auth/token`: Exchanges `PRABU_MCP_API_KEY` for a short-lived JWT (1h expiry)
    - `GET /api/finance/summary`: Returns aggregated income and monthly metrics from Notion
    - `POST /api/finance/sync`: Triggers salary sync from Outlook to Notion with deduplication
    - `GET /api/transactions`: Queries transactions from Notion DB with optional filters & pagination
    - `GET /api/health`: Health status endpoint returning database and Outlook connectivity
  - Flexible auth middleware supporting both Bearer JWT and direct API Key
  - Mounted REST API under `/api` in `packages/mcp` HTTP server for unified Railway deployment
  - Added standalone `start:api` script and updated root `Dockerfile`
  - Created `docs/api-spec.md` with complete OpenAPI & curl documentation
  - Added automated API test suite (11 total tests passing across monorepo)
- **Branch**: `feature/phase-4-api`
- **Agent**: Antigravity

- **Implemented** Gmail Token Bridge for Cloud MCP
  - Created `packages/core/src/gmail`: configuration, types, and auth loader checking Postgres (`oauth_tokens`, provider `oauth2`, user_id `gmail`) and disk (`~/.gmail-mcp/credentials.json`)
  - Added `upsertOAuth2Token`, `getOAuth2Token`, `hasOAuthToken` in `@prabu-life-os/shared`
  - Added `POST /auth/gmail/bridge` (API key protected) in `@prabu-life-os/mcp`
  - Updated `/auth/status` and `/api/health` to report `gmail: boolean`
  - Created `scripts/auth-gmail-bridge.js` & `scripts/auth-gmail-bridge.ps1` with `npm run auth:gmail:bridge`
  - Documented Gmail bridge in `knowledge/RAILWAY.md`
- **Branch**: `feature/gmail-bridge`
- **Agent**: Antigravity

- **Implemented** PM Tool Proxy & Cloud MCP Integration
  - Created `packages/core/src/pmtool`: types, config (`PM_TOOL_BASE_URL`, `PM_MCP_TOKEN`), and client (`listMyTasks`, `getTask`, `searchTasks`)
  - Added MCP tools: `list_my_tasks`, `get_task`, `search_tasks` in `@prabu-life-os/mcp` (bringing total tools to 9)
  - Added REST API routes under `/api/pm` (`GET /api/pm/health`, `GET /api/pm/tasks`, `GET /api/pm/tasks/:id`, `GET /api/pm/search`)
  - Updated `.env.example` with `PM_TOOL_BASE_URL` and `PM_MCP_TOKEN`
  - Updated `docs/api-spec.md` with PM Tool proxy endpoint specifications
  - Automated test suite: 12 tests passing across workspaces
- **Branch**: `feature/pm-tool-proxy`
- **Agent**: Antigravity

- **Added** Multi-Agent Tooling & Workflow Documentation
  - Created `knowledge/TOOLING.md`: agent responsibilities (Antigravity, Grok CLI, Cursor PM), MCP configuration, and fallback handling when hitting quotas
  - Created `knowledge/prompts/ANTIGRAVITY-PHASE-4.md`: standardized Phase 4 REST API agent prompt
  - Updated `knowledge/PLAN.md` checkboxes and phase statuses
  - Updated `knowledge/STATUS.md` with Phase 3/4 completions and metrics
- **Branch**: `feature/tooling-docs`
- **Agent**: Antigravity

---

## Template for new entries

```
## YYYY-MM-DD

- **Changed** what — why — files affected
- **Agent**: Antigravity | Grok | Cursor PM
```

