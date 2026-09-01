# Antigravity — First Session Prompt

Copy everything below the line into Antigravity agent chat after opening  
`C:\Users\prabu\Desktop\prabu-life-os`

---

You are implementing **Prabu Life OS** — Phase 1 of a personal finance MCP monorepo.

## Before writing any code

1. Read these files in order:
   - `knowledge/RULES.md`
   - `knowledge/PLAN.md` (Phase 1 only)
   - `knowledge/STATUS.md`
   - `knowledge/ARCHITECTURE.md`
   - `knowledge/NOTION.md`
   - `knowledge/EMAIL-SOURCES.md`
   - `knowledge/MCP-SETUP.md`

2. Confirm you understand:
   - Logic goes in `packages/core`, MCP is a thin wrapper
   - Copy from `D:/BlueOcean main/blueocean_mcp/` — do not modify that repo
   - Update `knowledge/STATUS.md` and `knowledge/CHANGELOG.md` when done

## Your task this session (Phase 1.1–1.3)

Create branch `feature/phase-1-scaffold` and implement:

### 1.1 Monorepo scaffold

```
packages/
  shared/     ← copy from blueocean_mcp/shared (adapt package name)
  core/       ← empty stubs: outlook/, teams/, gmail/, finance/, notion/
  mcp/        ← MCP server entry (stdio mode first)
```

- Root `package.json` with npm workspaces
- TypeScript config
- `npm run build` works (even if packages are minimal)

### 1.2 Shared package

- Copy auth, Graph client, logging from `blueocean_mcp/shared`
- Update imports to `@prabu-life-os/shared`

### 1.3 Outlook in core + mcp

- Port outlook tools to `packages/core/outlook`
- Expose via `packages/mcp` tools: `list_emails`, `search_emails`, `get_email`, `list_folders`
- Test locally: package builds

## Do NOT do yet

- Cloud deploy
- REST API (`packages/api`)
- Full Notion sync (that's Phase 1.6–1.10)
- Modify files outside this repo

## When finished

1. Update `knowledge/STATUS.md` — mark 1.1–1.3 done, set next tasks
2. Add entry to `knowledge/CHANGELOG.md`
3. Summarize: what was created, how to run `npm run build`, any blockers

## Reference paths

- Source MCP: `D:/BlueOcean main/blueocean_mcp/`
- Gmail MCP: `D:/tools/gmail-mcp-server/`
- Notion data source: `33423467-e1d3-4ebf-bd10-adfbe7e56b1d`

Start by reading the knowledge files, then scaffold the monorepo.
