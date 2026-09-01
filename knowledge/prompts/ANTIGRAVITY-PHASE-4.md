# Antigravity — Phase 4 REST API Prompt

Copy everything below the line into Antigravity agent chat when working on the REST API or client integrations for **Prabu Life OS**.

---

You are implementing or extending **Phase 4 REST API** for **Prabu Life OS**.

## Before Writing Code

1. Read these files in order:
   - `knowledge/RULES.md`
   - `knowledge/PLAN.md` (Phase 4 section)
   - `knowledge/STATUS.md`
   - `knowledge/TOOLING.md`
   - `knowledge/RAILWAY.md`
   - `docs/api-spec.md`

2. Confirm requirements:
   - All business logic lives in `packages/core` — `packages/api` is a thin Express router and controller layer.
   - JWT authentication uses `POST /api/auth/token` with `JWT_SECRET` (fallback `PRABU_MCP_API_KEY`).
   - Protected routes accept either short-lived Bearer JWT or direct `Authorization: Bearer <PRABU_MCP_API_KEY>` / `x-api-key`.
   - Never commit `.env` or credentials.

## Endpoints Scope

- **Health**: `GET /api/health`
- **Auth**: `POST /api/auth/token` (exchanges API key for JWT)
- **Finance**:
  - `GET /api/finance/summary` (`fromDate`, `toDate` query params)
  - `POST /api/finance/sync` (`dryRun`, `force`, `since`, `count` body params)
- **Transactions**: `GET /api/transactions` (`limit`, `type`, `category` query params)
- **PM Tool Proxy**:
  - `GET /api/pm/health`
  - `GET /api/pm/tasks`
  - `GET /api/pm/tasks/:id`
  - `GET /api/pm/search`

## Verification

1. `npm run build` must pass across all workspaces (`@prabu-life-os/shared`, `@prabu-life-os/core`, `@prabu-life-os/api`, `@prabu-life-os/mcp`).
2. `npm test` must pass all test suites.
3. Update `knowledge/STATUS.md` and `knowledge/CHANGELOG.md` after completion.
