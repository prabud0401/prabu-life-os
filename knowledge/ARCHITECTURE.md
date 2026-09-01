# Architecture

## High-level

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Outlook    │  │   Gmail     │  │   Teams     │
│  (Wise FW)  │  │  (bank etc) │  │  (work)     │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┼────────────────┘
                        ▼
              ┌─────────────────┐
              │  packages/core   │  ← business logic
              │  outlook/gmail/  │
              │  teams/finance/  │
              │  notion/         │
              └────────┬─────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
┌─────────────────┐        ┌─────────────────┐
│  packages/mcp   │        │  packages/api   │  (Phase 4)
│  Cursor/Grok/   │        │  Mobile REST    │
│  Antigravity    │        │                 │
└────────┬────────┘        └────────┬────────┘
         │                          │
         └────────────┬─────────────┘
                      ▼
            ┌─────────────────┐
            │  Notion         │
            │  Transactions   │
            └─────────────────┘
```

## Package responsibilities

| Package | Responsibility |
|---------|----------------|
| `shared` | OAuth, MS Graph client, token cache, logging |
| `core` | Pure functions: parse email, sync, query — no MCP/HTTP |
| `mcp` | MCP tool definitions + stdio/http server |
| `api` | REST routes, JWT (Phase 4) |

## Auth (phases)

| Phase | Token storage | OAuth redirect |
|-------|---------------|----------------|
| 1–2 | Local `~/.blueocean-mcp/` | localhost |
| 3+ | PostgreSQL | `https://<railway>/auth/callback` |

## Deploy target (Phase 3)

- **Platform**: Railway
- **Container**: Dockerfile, `MCP_MODE=http`, port 3000
- **Endpoints**: `/sse`, `/messages`, `/health`, `/api/v1/*`

## Reference implementation

Copy from `D:/BlueOcean main/blueocean_mcp/` — do not modify that repo from here.
