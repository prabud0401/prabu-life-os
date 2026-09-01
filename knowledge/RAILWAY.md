# Prabu Life OS — Railway deploy

## Architecture

```
Railway project
├── Postgres     (oauth_tokens, sync_log) — you created this
└── prabu-life-os app (Node MCP, MCP_MODE=http)
         │
         ├── /health
         ├── /sse + /messages   (MCP, API key required)
         ├── /auth/microsoft    (Outlook OAuth)
         └── Notion API
```

## 1. Add app service

1. Railway project → **New** → **GitHub Repo** → `prabu-life-os` (the **root repo**, not a package)
2. Branch: `main`
3. Railway must use the root **Dockerfile** (see `railway.toml`)

### ⚠️ Wrong setup (fix if you see this)

Railway sometimes auto-creates **separate services** for npm workspaces:

- `@prabu-life-os/core` ❌ delete
- `@prabu-life-os/mcp` ❌ delete

You need **one** service for the whole repo. Steps:

1. **Do not deploy** the workspace services (cancel "Apply changes" if pending)
2. Delete `@prabu-life-os/core` and `@prabu-life-os/mcp` services
3. **New** → **GitHub Repo** → select `prabud0401/prabu-life-os`
4. Open the new service → **Settings** → **Build**:
   - Builder: **Dockerfile**
   - Dockerfile path: `Dockerfile`
   - Root directory: `/` (repo root)
5. **Postgres must be in the same Railway project** as the app (add Postgres here if you only have it in another project)

## 2. Link Postgres to app

App service → **Variables** → **Add Variable Reference**:

| Name | Reference |
|------|-----------|
| `DATABASE_URL` | Postgres → `DATABASE_URL` |

## 3. Required env vars (app service)

| Variable | Example / notes |
|----------|-----------------|
| `MCP_MODE` | `http` |
| `PORT` | `3000` (Railway sets `PORT` automatically — keep it) |
| `PRABU_MCP_API_KEY` | Random string, e.g. `openssl rand -hex 32` |
| `NOTION_TOKEN` | Your Notion integration token |
| `OUTLOOK_CLIENT_ID` | Azure app registration |
| `OUTLOOK_TENANT_ID` | Azure tenant ID |
| `OUTLOOK_CLIENT_SECRET` | Azure client secret (required for web OAuth) |
| `OAUTH_REDIRECT_URI` | `https://YOUR-APP.up.railway.app/auth/microsoft/callback` |

**Do not** rely on Azure Key Vault on Railway — set Outlook vars explicitly.

### Optional / feature-specific vars

| Variable | Purpose |
|----------|---------|
| `GMAIL_OAUTH_KEYS_B64` | Base64 of `gcp-oauth.keys.json` — required for Gmail API calls on Railway |
| `PM_MCP_TOKEN` | PM Tool MCP proxy auth token |
| `PM_TOOL_BASE_URL` | PM Tool MCP HTTP endpoint (default `https://pm-tool.blueoceansp.dev/api/mcp`) |
| `CURSOR_API_KEY` | Cursor API key (`crsr_...`) for mobile AI assistant (`/api/assistant/chat`) |
| `CURSOR_MODEL` | Cursor model id (default `composer-2.5`) |
| `JWT_SECRET` | JWT signing for mobile auth (optional; falls back to API key) |
| `NOTION_DATABASE_ID` | Notion income database (optional; has default) |
| `MCP_PUBLIC_URL` | Public MCP URL for Gemini web OAuth |
| `MCP_OAUTH_CLIENT_ID` | Gemini MCP OAuth client ID |
| `MCP_OAUTH_CLIENT_SECRET` | Gemini MCP OAuth client secret (not the same as `PRABU_MCP_API_KEY`) |

See also: `knowledge/GEMINI-MCP.md` for Gemini web setup.

## 4. Azure redirect URI

In Azure Portal → App registrations → your app → **Authentication**:

Add redirect URI:

```
https://YOUR-APP.up.railway.app/auth/microsoft/callback
```

## 5. Generate public domain

App service → **Settings** → **Networking** → **Generate Domain**

Copy the URL and set `OAUTH_REDIRECT_URI` accordingly.

## 6. Connect Outlook (one-time)

### Option A — Azure redirect (needs app admin)

Open in browser:

```
https://YOUR-APP.up.railway.app/auth/microsoft
```

Sign in with your Microsoft account. Token is saved to Postgres (`oauth_tokens`, provider=`msal`).

### Option B — Local bridge (no Azure redirect change)

If you cannot add a Railway redirect URI to the corporate Azure app, push your **local** Outlook token to Railway Postgres:

```powershell
cd C:\Users\prabu\Desktop\prabu-life-os
.\scripts\auth-outlook-bridge.ps1
```

First-time local sign-in:

```powershell
.\scripts\auth-outlook-bridge.ps1 -Auth
```

Or:

```powershell
npm run auth:outlook:bridge -- --auth
```

This uses `~/.blueocean-mcp/outlook-tokens.json` (same cache as local Outlook MCP) and POSTs it to `POST /auth/microsoft/bridge` with your `PRABU_MCP_API_KEY`.

Check status:

```powershell
npm run auth:outlook:bridge -- --status
```

Expected: `"outlook": true` on `/auth/status`.

## 7. Connect Gmail (one-time bridge)

Push your local Gmail OAuth2 credentials (`~/.gmail-mcp/credentials.json` from `D:/tools/gmail-mcp-server`) into Railway Postgres:

```powershell
cd C:\Users\prabu\Desktop\prabu-life-os
.\scripts\auth-gmail-bridge.ps1
```

Or:

```powershell
npm run auth:gmail:bridge
```

Check status:

```powershell
npm run auth:gmail:bridge -- --status
```

Expected: `"gmail": true`, `"outlook": true` on `/auth/status`.

## 7b. Connect Teams (one-time bridge)

Teams uses a **separate** MSAL cache from Outlook (`user_id = "teams"` in Postgres).

First-time local sign-in:

```powershell
cd C:\Users\prabu\Desktop\prabu-life-os
npm run auth:teams
```

Push local cache to Railway:

```powershell
npm run auth:token:bridge -- --teams
```

Or push everything at once:

```powershell
npm run auth:token:bridge -- --all
```

Check status:

```powershell
npm run auth:token:bridge -- --status
```

Expected: `"teams": true` on `/auth/status`.

## 8. Grok remote MCP

`.grok/config.toml`:

```toml
[mcp_servers.prabu-life-os-remote]
type = "http"
url = "https://YOUR-APP.up.railway.app/sse"
headers = { Authorization = "Bearer YOUR_PRABU_MCP_API_KEY" }
```

```powershell
grok --trust mcp doctor prabu-life-os-remote
```

## 8. Health check

```powershell
curl https://YOUR-APP.up.railway.app/health
```

Expected: `{ "status": "ok", "database": true }`

Full API health (auth flags):

```powershell
curl https://YOUR-APP.up.railway.app/api/health
```

Expected fields: `database`, `outlook`, `teams`, `gmail` (each `true` when tokens are valid).

## Local HTTP test (optional)

```powershell
cd C:\Users\prabu\Desktop\prabu-life-os
# .env: MCP_MODE=http, PORT=3000, DATABASE_URL=..., PRABU_MCP_API_KEY=...
npm run build
npm run start:mcp
curl http://localhost:3000/health
```

## Tables (auto-created on startup)

- `oauth_tokens` — MSAL / OAuth2 token cache
- `sync_log` — sync job audit trail
- `financial_transactions` — finance intelligence ledger
- `mobile_device_tokens` — Expo push tokens

SQL reference: `migrations/001_initial.sql`, `002_financial_transactions.sql`, `003_mobile_device_tokens.sql`
