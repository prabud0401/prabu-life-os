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
- **Branch**: `feature/phase-1-scaffold`
- **Agent**: Antigravity

---

## Template for new entries

```
## YYYY-MM-DD

- **Changed** what — why — files affected
- **Agent**: Antigravity | Grok | Cursor PM
```

