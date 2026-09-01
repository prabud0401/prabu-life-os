# Deploy Guide (Phase 3+)

**Not active yet.** Reference for when Phase 1–2 are complete.

## Target

- **Platform**: Railway
- **Cost**: ~$5–10/mo (app + Postgres)
- **Region**: closest to Sri Lanka (Singapore or EU)

## Steps (outline)

1. Add Dockerfile (copy pattern from `blueocean_mcp/mcps/outlook/Dockerfile`)
2. Add PostgreSQL on Railway
3. Migrate token store from `~/.blueocean-mcp/` to DB
4. Set env vars: `AZURE_KEYVAULT_URL`, `NOTION_TOKEN`, `PRABU_MCP_API_KEY`, `DATABASE_URL`
5. Register OAuth redirect: `https://<app>.up.railway.app/auth/callback`
6. `railway up` or GitHub auto-deploy
7. Update Grok/Antigravity MCP to remote `serverUrl`

## Health check

`GET /health` → `{ "status": "ok" }`

## Security checklist

- [ ] HTTPS only
- [ ] API key on `/sse`
- [ ] No secrets in git
- [ ] JWT for REST API (Phase 4)
