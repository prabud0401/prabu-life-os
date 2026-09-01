# Prabu Life OS

Personal finance and life-management platform: unified MCP server + REST API, synced from Gmail/Outlook into Notion.

## Start here

| Audience | Read first |
|----------|------------|
| Any IDE or agent | [`knowledge/README.md`](knowledge/README.md) |
| Antigravity / Grok / Cursor | [`knowledge/RULES.md`](knowledge/RULES.md) |
| Current status | [`knowledge/STATUS.md`](knowledge/STATUS.md) |
| Master plan | [`knowledge/PLAN.md`](knowledge/PLAN.md) |
| First Antigravity prompt | [`knowledge/prompts/ANTIGRAVITY-START.md`](knowledge/prompts/ANTIGRAVITY-START.md) |

## Project manager

**Cursor agent (Prabu's PM)** owns status reviews, plan updates, and feedback. Agents implementing code must update `knowledge/STATUS.md` and `knowledge/CHANGELOG.md` when finishing work.

## Tools

| Tool | Role |
|------|------|
| Antigravity | Primary IDE (Google AI Pro) |
| Grok CLI | MCP agent + finance sync |
| Notion | Transactions database (source of truth) |
| Railway (later) | Cloud deploy (~$5–10/mo) |

## Repo layout

```
prabu-life-os/
├── knowledge/          ← single source of truth (read before any work)
├── packages/           ← code (Phase 1+)
├── config/             ← non-secret config
├── AGENTS.md
└── README.md
```
