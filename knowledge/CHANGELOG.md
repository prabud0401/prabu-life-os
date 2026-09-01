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
- **Branch**: `feature/phase-1-scaffold`
- **Agent**: Antigravity

---

## Template for new entries

```
## YYYY-MM-DD

- **Changed** what — why — files affected
- **Agent**: Antigravity | Grok | Cursor PM
```

