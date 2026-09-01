# Status Board

**Last updated**: 2026-09-01  
**Current phase**: PM Tool Proxy, Gmail Bridge & Phase 4 REST API implemented  
**PM**: Cursor agent  
**GitHub**: https://github.com/prabud0401/prabu-life-os  
**Local path**: `C:\Users\prabu\Desktop\prabu-life-os`

---

## In progress

| Task | Owner | Notes |
|------|-------|-------|
| Merge feature/pm-tool-proxy to main | PM / User | PM proxy, Gmail bridge, REST API & tests ready |

---

## Done

- [x] Notion Finance Hub + Transactions DB created
- [x] 4 sample transactions seeded in Notion
- [x] Grok MCP verified: outlook, teams, gmail-local working
- [x] Knowledge hub created in `prabu-life-os`
- [x] GitHub repo: https://github.com/prabud0401/prabu-life-os
- [x] Local clone on Desktop: `C:\Users\prabu\Desktop\prabu-life-os`
- [x] **Phase 1.1**: Scaffold npm workspaces (`@prabu-life-os/shared`, `@prabu-life-os/core`, `@prabu-life-os/mcp`)
- [x] **Phase 1.2**: Ported shared auth, KeyVault, OAuth2, Graph client, logger
- [x] **Phase 1.3**: Ported Outlook service to `packages/core/outlook` & exposed via `packages/mcp` (list, get, search, folders)
- [x] Committed Phase 1.1–1.3 to `feature/phase-1-scaffold`
- [x] **Phase 1.6**: Wise email parser & Notion write client with deduplication in `packages/core/finance` & `packages/core/notion`
- [x] **Phase 1.7**: Expose `sync_salary_to_notion` and `get_income_summary` tools via `@prabu-life-os/mcp`
- [x] **Phase 1.10**: Live sync executed — 31 rows in Notion Transactions DB, verified deduplication skips existing records
- [x] Verified `get_income_summary`: $8,490.73 USD across 31 transfers (30 salary, 1 bonus)
- [x] Verified `npm run build` passes across all workspaces
- [x] **Merged** `feature/phase-1-scaffold` → `main` via [PR #1](https://github.com/prabud0401/prabu-life-os/pull/1)
- [x] **Phase 1.9**: Grok MCP doctor — `prabu-life-os` (6 tools), `outlook` (4), `gmail-local` (9) all healthy (`grok --trust mcp doctor <name>`)
- [x] **Phase 2**: Notion schema expanded (`Transfer ID`, `Amount LKR`), 31 rows repaired/backfilled
- [x] **Phase 2**: `get_income_summary` LKR total fixed — **2,648,425.18 LKR** (matches parser reference)
- [x] **Phase 2**: Parser unit tests (5 passing), `repairNotionTransactions()` + `scripts/repair-notion-rows.js`
- [x] **Merged** `feature/phase-2-polish` → `main` via [PR #2](https://github.com/prabud0401/prabu-life-os/pull/2)
- [x] **Phase 3 (code)**: Postgres token store, HTTP MCP + API key, Microsoft OAuth routes, Dockerfile, `railway.toml`
- [x] Railway Postgres tables: `oauth_tokens`, `sync_log`
- [x] **Phase 3 deploy**: Live app service deployed on Railway (`https://prabu-life-os-production.up.railway.app`)
- [x] **Outlook token bridge**: `POST /auth/microsoft/bridge` + `scripts/auth-outlook-bridge.ps1` (`npm run auth:outlook:bridge`)
- [x] Cloud auth status verified: `"outlook": true`, `"database": true` on `/auth/status`
- [x] Remote MCP endpoint active: `https://prabu-life-os-production.up.railway.app/sse` with `Authorization: Bearer ${PRABU_MCP_API_KEY}`
- [x] **Phase 4 REST API**: Created `@prabu-life-os/api` with JWT auth (`POST /api/auth/token`), protected routes (`/api/finance/summary`, `/api/finance/sync`, `/api/transactions`, `/api/health`)
- [x] Mounted REST API under `/api` in `packages/mcp` http-server and added standalone runner (`npm run start:api`)
- [x] Added `docs/api-spec.md` with full request/response examples
- [x] Automated test suite: 12 tests passing across `core` and `api`
- [x] **Gmail Token Bridge**: `POST /auth/gmail/bridge` + `scripts/auth-gmail-bridge.js` / `.ps1` (`npm run auth:gmail:bridge`)
- [x] `packages/core/gmail` wrapper for Postgres/disk credentials + `packages/shared` OAuth2 token helpers
- [x] **PM Tool Proxy & Cloud MCP**:
  - Added `packages/core/pmtool` (`listMyTasks`, `getTask`, `searchTasks`)
  - Exposed MCP tools: `list_my_tasks`, `get_task`, `search_tasks` (now 9 total tools in `@prabu-life-os/mcp`)
  - Mounted proxy routes under `/api/pm` (`/api/pm/health`, `/api/pm/tasks`, `/api/pm/tasks/:id`, `/api/pm/search`)

---

## Next up (Antigravity / Grok / PM)

1. Mobile client / frontend integration calling Phase 4 REST API
2. Port Phase 1.4 Teams tools to `packages/core/teams`
3. Expose Gmail tools in `packages/mcp` and `packages/core/gmail`

---

## Blockers

*None currently blocking.*

---

## Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Salary rows in Notion | 31 | 31 (all synced, backfilled) |
| Income totals | $8,490.73 / 2.65M LKR | ✅ $8,490.73 / 2,648,425.18 LKR |
| MCP tools working | outlook, teams, gmail, finance, pmtool | 9 via `prabu-life-os` MCP |
| REST API endpoints | health, auth, finance, transactions, pm | 9 endpoints under `/api` |
| Token bridges | Outlook + Gmail | ✅ Outlook (`msal`) + Gmail (`oauth2`) |
| Test suite | passing | 12/12 passing |
| Cloud deployed | Phase 3/4 | ✅ Live on Railway (MCP + REST API + Bridges) |

---

## How to update this file

Any agent after a work session: edit **In progress**, **Done**, **Next up**, **Blockers**, **Metrics**, and **Last updated** date.
