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

1. Railway project → **New** → **GitHub Repo** → `prabu-life-os`
2. Branch: `main` (after PR merge) or `feature/phase-3-railway` for testing
3. Railway detects **Dockerfile** automatically

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

Open in browser:

```
https://YOUR-APP.up.railway.app/auth/microsoft
```

Sign in with your Microsoft account. Token is saved to Postgres (`oauth_tokens`, provider=`msal`).

Check status:

```
https://YOUR-APP.up.railway.app/auth/status
```

## 7. Grok remote MCP

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

## Local HTTP test (optional)

```powershell
cd C:\Users\prabu\Desktop\prabu-life-os
# .env: MCP_MODE=http, PORT=3000, DATABASE_URL=..., PRABU_MCP_API_KEY=...
npm run build
npm run start:mcp
curl http://localhost:3000/health
```

## Tables (already created in Console)

- `oauth_tokens` — MSAL cache blob in `refresh_token` when `provider='msal'`
- `sync_log` — sync job audit trail

SQL reference: `migrations/001_initial.sql`
