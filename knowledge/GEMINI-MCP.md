# Connect Gemini web to Prabu Life OS MCP

Gemini Spark (gemini.google.com → Settings → Connected Apps) uses **OAuth**, not a raw API key.

## 1. Railway env vars

Set on the `prabu-life-os` service:

| Variable | Example |
|----------|---------|
| `MCP_PUBLIC_URL` | `https://prabu-life-os-production.up.railway.app` |
| `MCP_OAUTH_CLIENT_ID` | `prabu-life-os-gemini` |
| `MCP_OAUTH_CLIENT_SECRET` | random 64-char hex |

Generate secret:

```powershell
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
```

```powershell
railway variables --set "MCP_PUBLIC_URL=https://prabu-life-os-production.up.railway.app"
railway variables --set "MCP_OAUTH_CLIENT_ID=prabu-life-os-gemini"
railway variables --set "MCP_OAUTH_CLIENT_SECRET=YOUR_SECRET"
railway redeploy --service prabu-life-os -y
```

## 2. Gemini web setup

1. Go to [gemini.google.com](https://gemini.google.com) → **Settings** → **Connected Apps**
2. **Add a custom app**
3. **URL:**
   ```
   https://prabu-life-os-production.up.railway.app/mcp
   ```
4. **Advanced** → enter:
   - **Client ID:** `prabu-life-os-gemini` (or your `MCP_OAUTH_CLIENT_ID`)
   - **Client secret:** your `MCP_OAUTH_CLIENT_SECRET`
5. Click **Next** → browser opens **Allow access** → approve
6. In Spark, use `@` to pick your custom app

## 3. Verify

```powershell
Invoke-RestMethod https://prabu-life-os-production.up.railway.app/.well-known/oauth-authorization-server
Invoke-RestMethod https://prabu-life-os-production.up.railway.app/oauth/gemini-setup
```

Unauthenticated `/mcp` returns `401` with `WWW-Authenticate` (expected).

## Grok / Antigravity (unchanged)

Keep using `/sse` + `PRABU_MCP_API_KEY`:

```
https://prabu-life-os-production.up.railway.app/sse
```

## Endpoints

| Path | Auth | Client |
|------|------|--------|
| `/mcp` | OAuth or API key | Gemini web |
| `/sse` | API key | Grok, Antigravity |
| `/oauth/authorize` | Browser login | OAuth |
| `/.well-known/oauth-protected-resource/mcp` | Public | Discovery |
