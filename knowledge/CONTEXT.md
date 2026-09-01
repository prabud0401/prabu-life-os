# Project Context

## Vision

**Prabu Life OS** is a personal backend that:

1. Reads financial transactions from **Outlook** (work salary) and **Gmail** (personal)
2. Stores them in **Notion** (Transactions database)
3. Exposes **MCP tools** for AI agents (Grok, Antigravity, Cursor)
4. Exposes **REST API** later for a mobile app

## Owner

- **Name**: Prabudeva Udayasooriyan
- **Work email**: PrabudevaU@blueoceansp.ai
- **Location**: Sri Lanka (LKR home currency)

## Why this exists

- Salary arrives via Bharath Bangalore forwarding Wise transfer emails (~bi-weekly)
- Manual tracking is error-prone; 32+ transfers since Aug 2025
- Want one system: agent-synced, Notion dashboard, future mobile app

## Income context (verified Sep 2026)

| Item | Detail |
|------|--------|
| Employer | Blue Ocean SP (contract) |
| Payer | Bharath Bangalore (`brbangalore@blueoceansp.ai`) |
| Method | Wise (Be Better Resourced → LKR account) |
| Rate | ~$2.50/hr |
| Lifetime (Aug 2025–Aug 2026) | ~2,648,425 LKR / ~8,490 USD, 32 transfers |

## Related repos (do not merge)

| Repo | Path | Role |
|------|------|------|
| `blueocean_mcp` | `D:/BlueOcean main/blueocean_mcp` | Work MCP source — copy patterns only |
| `personal-finance` | `C:/Users/prabu/Projects/personal-finance` | Early prototype docs — superseded by this repo |
| `study-abroad` | Separate project | Not related |

## Subscriptions in use

| Tool | Plan | Use |
|------|------|-----|
| Antigravity | Google AI Pro | Primary IDE |
| Grok CLI | Paid | MCP agent terminal |
| Cursor | Optional | PM reviews |
| Railway | Later ~$5/mo | Cloud deploy |

## Success criteria (v1)

- [ ] Unified local MCP: Outlook + Teams + Gmail + finance tools
- [ ] `sync_salary_to_notion` works end-to-end
- [ ] All 32 historical salary transfers in Notion
- [ ] Knowledge hub always up to date
- [ ] Deployed to cloud (Phase 3)
