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
- [ ] **1.4** Port Teams tools (list_teams, channels, messages, chats)
- [ ] **1.5** Add Gmail-local tools wrapper in `core/gmail`
- [ ] **1.6** `packages/core/finance` — parse Wise email, dedup, Notion write
- [ ] **1.7** MCP tools: `sync_salary_to_notion`, `get_income_summary`
- [ ] **1.8** `config/default.json` with Notion IDs (no secrets)
- [ ] **1.9** Test via Grok: `grok mcp doctor` all green for outlook/teams/gmail-local
- [ ] **1.10** Sync all 32 historical salary transfers to Notion

### Acceptance

- Grok can run: *"Sync salary from Outlook to Notion"*
- Notion Transactions DB has 32+ salary rows, no duplicates
- `npm run build` passes

---

## Phase 2 — Polish & Notion (week 3)

- [ ] Expand Notion DB fields (Transfer ID column if API allows)
- [ ] Monthly summary helper in `core/finance`
- [ ] Error handling + logging
- [ ] Unit tests for Wise email parser

---

## Phase 3 — Cloud deploy (weeks 4–5)

- [ ] PostgreSQL token store (replace `~/.blueocean-mcp/` files)
- [ ] Cloud OAuth redirect URIs (Microsoft + Google)
- [ ] `MCP_MODE=http` + API key on `/sse`
- [ ] Deploy to Railway
- [ ] Grok + Antigravity connect via remote URL

**Cost**: ~$8–12/mo

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

**Phase 1** — not started (repo scaffold pending)

## PM checkpoints

| After phase | PM review |
|-------------|-----------|
| Phase 1 | Verify Notion row count, MCP doctor, build |
| Phase 3 | Security audit (API key, HTTPS, no leaked secrets) |
| Phase 4 | API contract review for mobile |
