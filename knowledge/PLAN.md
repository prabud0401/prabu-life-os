# Master Plan — Prabu Life OS

## Repo strategy

| When | Repos |
|------|-------|
| Now | **1 repo**: `prabu-life-os` (this repo) |
| Phase 5+ | **2 repos**: add `prabu-life-os-mobile` |

## Phase 1 — Local MCP monorepo (weeks 1–2)

**Goal**: One MCP server with Outlook, Teams, Gmail, finance tools. Works in Grok locally.

### Tasks

- [x] **1.1** Scaffold npm workspaces: `packages/shared`, `core`, `mcp`
- [x] **1.2** Copy/adapt `blueocean_mcp/shared` auth + Graph client
- [x] **1.3** Port Outlook tools (list, search, get, folders)
- [ ] **1.4** Port Teams tools (list_teams, channels, messages, chats) [Deferred by PM]
- [ ] **1.5** Add Gmail-local tools wrapper in `core/gmail`
- [x] **1.6** `packages/core/finance` — parse Wise email, dedup, Notion write
- [x] **1.7** MCP tools: `sync_salary_to_notion`, `get_income_summary`
- [x] **1.8** `config/default.json` with Notion IDs (no secrets)
- [x] **1.9** Test via Grok: `grok --trust mcp doctor` green for `prabu-life-os`, `outlook`, `gmail-local`
- [x] **1.10** Sync all 31 historical salary transfers to Notion

### Acceptance

- Grok can run: *"Sync salary from Outlook to Notion"*
- Notion Transactions DB has 32+ salary rows, no duplicates
- `npm run build` passes

---

## Phase 2 — Polish & Notion (week 3)

- [x] Expand Notion DB fields (`Transfer ID`, `Amount LKR`)
- [x] Backfill + repair legacy rows (Currency/LKR/Transfer ID)
- [x] Monthly summary helper (`getMonthlyIncomeSummary`)
- [x] Error handling + logging (`logger` in Notion sync/repair)
- [x] Unit tests for Wise email parser

---

## Phase 3 — Cloud deploy (weeks 4–5)

- [x] PostgreSQL token store (`DATABASE_URL` → `oauth_tokens`, provider `msal`)
- [x] Cloud OAuth routes (`/auth/microsoft`, `/auth/microsoft/callback`)
- [x] Local token bridge (`POST /auth/microsoft/bridge` + `scripts/auth-outlook-bridge.ps1`)
- [x] `MCP_MODE=http` + API key on `/sse` and `/messages`
- [x] Dockerfile + `railway.toml`
- [x] Deploy app service to Railway (`https://prabu-life-os-production.up.railway.app`)
- [x] Grok + Antigravity connect via remote URL (`/sse`)

**Cost**: ~$8–12/mo

---

## Phase 3 deploy guide

See **`knowledge/RAILWAY.md`** for step-by-step Railway setup and bridge auth.

---

## Phase 4 — REST API (weeks 6–7)

- [ ] `packages/api` — Express/Fastify
- [ ] JWT auth
- [ ] Endpoints: `/finance/summary`, `/finance/sync`, `/transactions`
- [ ] `docs/api-spec.md`

---

## Phase 5 — Mobile app (week 8+)

- [ ] New repo `prabu-life-os-mobile`
- [ ] Flutter or React Native
- [ ] Calls Phase 4 API only

---

## Current phase

**Current phase**: Phase 3 completed — ready for Phase 4 REST API / Phase 1.4 Teams / 1.5 Gmail

## PM checkpoints

| After phase | PM review |
|-------------|-----------|
| Phase 1 | Verify Notion row count, MCP doctor, build |
| Phase 3 | Security audit (API key, HTTPS, no leaked secrets) |
| Phase 4 | API contract review for mobile |
