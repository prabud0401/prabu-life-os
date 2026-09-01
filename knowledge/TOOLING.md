# Multi-Agent Tooling & Workflow Guide

This document defines the agent roles, configurations, and fallback strategies across **Antigravity**, **Grok CLI**, and **Cursor** for **Prabu Life OS**.

---

## 1. Tool Matrix & Responsibilities

| Tool | Core Role | Primary Responsibilities | Auth / Setup |
|---|---|---|---|
| **Antigravity** *(Gemini)* | **Implementer / Builder** | • TypeScript architecture (`packages/*`)<br>• Business logic & unit tests (`packages/core`)<br>• REST API & MCP server implementations<br>• Monorepo builds & verification | Read `knowledge/RULES.md` first. Uses local codebase tools and `prabu-life-os-remote` MCP for live integrations. |
| **Grok CLI** | **MCP Operator & Automation** | • Running MCP workflows (e.g. salary sync)<br>• MCP health checks (`grok --trust mcp doctor`)<br>• Ad-hoc queries and finance operations | Run with `grok --trust`. Must load `PRABU_MCP_API_KEY` from `.env` before starting remote MCP. |
| **Cursor** | **Project Manager & DevOps** | • PM reviews (`knowledge/PM-REVIEWS.md`)<br>• Phase approval and roadmap alignment<br>• Railway deployment & Postgres migrations<br>• Secret management (Azure Key Vault / Railway env vars) | Root IDE workspace. Manages git branches, reviews PRs, and tracks deliverables. |

---

## 2. Agent Specific Setup & Instructions

### Antigravity (Gemini)
1. **Read First**: Always read `knowledge/RULES.md`, `knowledge/PLAN.md`, and `knowledge/STATUS.md` before making any code modifications.
2. **Architecture**: All pure business logic lives in `packages/core`. `packages/mcp` and `packages/api` are thin wrappers.
3. **Remote MCP**: When interacting with the live cloud deployment, use the remote MCP endpoint:
   ```
   https://prabu-life-os-production.up.railway.app/sse
   Authorization: Bearer ${PRABU_MCP_API_KEY}
   ```
4. **Testing**: Always ensure `npm run build` and `npm test` pass before committing.

### Grok CLI
1. **Startup**: Run in trusted mode to grant permission for MCP commands:
   ```powershell
   grok --trust
   ```
2. **Environment**: Ensure `PRABU_MCP_API_KEY` is exported in the shell or configured in `.grok/config.toml`:
   ```toml
   [mcp_servers.prabu-life-os-remote]
   type = "http"
   url = "https://prabu-life-os-production.up.railway.app/sse"
   headers = { Authorization = "Bearer YOUR_PRABU_MCP_API_KEY" }
   ```
3. **Health Check**:
   ```powershell
   grok --trust mcp doctor prabu-life-os-remote
   ```
4. **Workflows**: Use Grok to run automated salary synchronization and check income summaries:
   - *"Sync salary from Outlook to Notion"*
   - *"Get my current year-to-date income summary"*

### Cursor (PM & Review)
1. **PM Log**: Review and append entries to `knowledge/PM-REVIEWS.md`.
2. **Railway Deployments**: Monitor Railway service health, Postgres tables, and logs.
3. **Token Management**: Handle OAuth token bridges using `npm run auth:outlook:bridge` and `npm run auth:gmail:bridge`.

---

## 3. Fallback Strategies (Quota / Rate Limits)

When an AI provider or model hits a rate limit or quota ceiling:

1. **Antigravity Quota Exhaustion**:
   - Switch to **Cursor** for code edits and refactoring.
   - Run verification tests locally: `npm test` and `npm run build`.
2. **Grok Quota / Downtime**:
   - Use the REST API endpoints directly via `curl` or scripts:
     - `POST /api/finance/sync` (with Bearer JWT or API Key)
     - `GET /api/finance/summary`
   - Or run local CLI scripts: `node scripts/sync-salary-live.js`.
3. **Token Expiration / Cloud Token Invalidation**:
   - If cloud Outlook auth expires, re-bridge from local MSAL cache:
     ```powershell
     npm run auth:outlook:bridge -- --auth
     ```
   - If Gmail auth expires, re-bridge:
     ```powershell
     npm run auth:gmail:bridge
     ```

---

## 4. End-of-Session Checklist (All Agents)

- [ ] Run `npm run build` — must pass with zero errors.
- [ ] Run `npm test` — all test suites must pass.
- [ ] Update `knowledge/STATUS.md` with current metrics and next steps.
- [ ] Add a summary of today's work to `knowledge/CHANGELOG.md`.
- [ ] **Never commit `.env` or plain-text credentials**.
