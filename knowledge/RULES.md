# Rules & Regulations — All Agents & IDEs

Every tool working on this repo **must** follow these rules.

## 1. Knowledge first

- Read `knowledge/README.md` read order before any code change.
- Never contradict `knowledge/PLAN.md` without logging a decision in `DECISIONS.md`.
- `knowledge/` is the SRS for this project. Code follows knowledge, not the reverse.

## 2. Planning vs implementation

| Mode | Allowed |
|------|---------|
| **Planning** | Read, ask questions, update `knowledge/`, no code |
| **Implementation** | User or PM says "implement" / "go ahead" / Phase task approved |

Default for Antigravity first session: **Phase 1 implementation** is pre-approved in `PLAN.md`.

## 3. Git discipline

- Branch: `feature/<task-name>` from `main`
- Commit when a logical unit is done (not every line)
- Commit message: complete sentence, focus on **why**
- **Never commit**: `.env`, tokens, `*-tokens.json`, credentials, API keys
- **Never**: `git push --force` to `main`
- Do not amend commits unless PM explicitly requests

## 4. Security

- Secrets only in environment variables or local untracked files
- Use `${VAR_NAME}` in MCP configs, never hardcode tokens in git
- Outlook/Teams tokens stay machine-local until Phase 3 cloud auth
- Notion tokens: env var `NOTION_TOKEN` only

## 5. Code conventions

- **Language**: TypeScript, Node 20+
- **Monorepo**: npm workspaces (`packages/*`)
- **Match** `blueocean_mcp` patterns when copying Outlook/Teams code
- **Logic in `packages/core`** — MCP and API are thin wrappers
- Minimal scope: smallest correct diff, no over-engineering
- No unrelated refactors

## 6. MCP rules

| MCP | Namespace | Use for |
|-----|-----------|---------|
| Outlook | `user-outlook` / stdio local | Salary (Barath Wise forwards) |
| Teams | `user-teams` / stdio local | Work chats |
| Gmail | `user-gmail-local` / stdio local | Personal bank, receipts |
| Notion | `plugin-notion-workspace-notion` | Transactions DB |

- Deduplicate by Wise Transfer ID before inserting Notion rows
- `Amount` must match `Currency` field (see `NOTION.md`)

## 7. Tool assignment

| Task | Primary tool |
|------|--------------|
| Write/edit TypeScript, Docker, tests | **Antigravity** |
| Run MCP sync, `grok mcp doctor`, agent tasks | **Grok CLI** |
| Status review, plan updates, feedback | **Cursor PM** |

## 8. Documentation updates (required)

After completing work, update:

```
knowledge/STATUS.md     ← current state
knowledge/CHANGELOG.md  ← what changed today
```

If blocked, add to `STATUS.md` → **Blockers** with what you tried.

## 9. Do not

- Edit Blue Ocean work repos (`blueocean_mcp`) from this project — copy code in, don't modify source
- Create duplicate Notion transactions
- Guess financial amounts — extract from email or ask user
- Add features not in current `PLAN.md` phase without PM note in `DECISIONS.md`

## 10. Owner

**Prabudeva Udayasooriyan** — final approval on scope changes.

**PM**: Cursor agent — reviews progress, updates `PM-REVIEWS.md`, keeps `PLAN.md` and `STATUS.md` aligned.
