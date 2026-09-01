# MCP Setup — Grok, Antigravity, Cursor

## Working MCPs (verified 2026-09-01 via `grok --trust mcp doctor`)

| MCP | Transport | Status | Tools |
|-----|-----------|--------|-------|
| **prabu-life-os** | stdio | ✅ | 6 (outlook ×4 + finance ×2) |
| outlook | stdio | ✅ | 4 |
| teams | stdio | ✅ | 5 |
| gmail-local | stdio | ✅ | 9 |
| pm-tool | http | ✅ | 51 |
| notion | plugin | ✅ | via Antigravity/Cursor |

> **Folder trust**: Repo-local stdio servers require `grok --trust` (or `/hooks-trust` in TUI) on first use. Without trust, doctor reports "folder untrusted".

## Grok CLI

**Install**: `C:\Users\prabu\.grok\bin\grok.exe` (v1.0.13)

```powershell
grok login                    # required once
cd C:\Users\prabu\Desktop\prabu-life-os
grok --trust inspect          # trust folder + verify project + MCPs
grok --trust mcp doctor prabu-life-os   # health check (6 tools)
grok --trust mcp doctor outlook         # health check (4 tools)
grok                          # interactive agent
```

**Config**: `~/.grok/config.toml` + auto-imports `~/.cursor/mcp.json`

**Project config**: `.grok/config.toml` in this repo (created below)

## Antigravity

**Config**: `~/.gemini/config/mcp_config.json`  
**Project override**: `.agents/mcp_config.json` (optional)

Remote MCP uses `serverUrl` (not `url`):

```json
{
  "mcpServers": {
    "outlook": {
      "command": "node",
      "args": ["D:/BlueOcean main/blueocean_mcp/mcps/outlook/dist/index.js"]
    }
  }
}
```

**CLI**: `agy` (if installed) — shares same MCP config

## Cursor (PM)

Uses `~/.cursor/mcp.json` — same servers as Grok imports.

## Local stdio paths (Windows)

```
Outlook:  node D:/BlueOcean main/blueocean_mcp/mcps/outlook/dist/index.js
Teams:    node D:/BlueOcean main/blueocean_mcp/mcps/teams/dist/index.js
Gmail:    node D:/tools/gmail-mcp-server/dist/index.js
Life OS:  node C:/Users/prabu/Desktop/prabu-life-os/packages/mcp/dist/index.js
```

**Prerequisites**: `az login`, Outlook/Teams one-time `npm run auth` in blueocean_mcp

## Phase 3 remote MCP (future)

```json
{
  "mcpServers": {
    "prabu-life-os": {
      "type": "http",
      "serverUrl": "https://prabu-life-os.up.railway.app/sse",
      "headers": { "Authorization": "Bearer ${PRABU_MCP_API_KEY}" }
    }
  }
}
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Grok "not authenticated" | `grok login` |
| Outlook MCP fails | `az login`, re-auth in blueocean_mcp |
| Google MCP OAuth required | Use `gmail-local` instead of cloud `gmail` |
| Antigravity MCP not showing | Refresh MCP list in agent panel |
