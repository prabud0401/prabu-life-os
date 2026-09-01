# Knowledge Hub — Prabu Life OS

**This folder is the single source of truth** for every IDE and agent (Antigravity, Grok CLI, Cursor, or any future LLM tool).

## Read order (mandatory before coding)

1. [`RULES.md`](RULES.md) — how every agent must work
2. [`CONTEXT.md`](CONTEXT.md) — what this project is
3. [`STATUS.md`](STATUS.md) — what's done / in progress / blocked
4. [`PLAN.md`](PLAN.md) — phased roadmap
5. [`ARCHITECTURE.md`](ARCHITECTURE.md) — system design
6. Topic docs as needed (MCP, Notion, email, deploy)

## File index

| File | Purpose | Who updates |
|------|---------|-------------|
| `RULES.md` | Agent rules, git, security, workflow | PM + owner approval |
| `CONTEXT.md` | Project background, goals, constraints | PM |
| `PLAN.md` | Phases, milestones, acceptance criteria | PM |
| `STATUS.md` | Live sprint/status board | **Any agent after each task** |
| `CHANGELOG.md` | Dated record of changes | **Any agent after each task** |
| `ARCHITECTURE.md` | Packages, data flow, auth | Implementing agent + PM review |
| `DECISIONS.md` | Architecture decision records (ADR) | PM |
| `MCP-SETUP.md` | Grok / Antigravity / Cursor MCP config | Implementing agent |
| `NOTION.md` | Notion page IDs, DB schema | PM |
| `EMAIL-SOURCES.md` | Outlook/Gmail search patterns | PM |
| `DEPLOY.md` | Railway/cloud deploy steps | Phase 3+ |
| `PM-REVIEWS.md` | Cursor PM feedback log | **Cursor PM only** |
| `prompts/` | Copy-paste prompts per tool | PM |

## After every work session

Any agent that changes code or config **must**:

1. Update `STATUS.md` (what changed, what's next, blockers)
2. Add entry to `CHANGELOG.md` (date, summary, files touched)
3. If architecture changed → update `ARCHITECTURE.md` or add to `DECISIONS.md`

## Project manager

**Cursor agent** is the designated PM. It reviews `STATUS.md`, validates against `PLAN.md`, and logs feedback in `PM-REVIEWS.md`. Implementation agents (Antigravity, Grok) do the build; PM does review and planning.
