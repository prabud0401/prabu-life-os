# Architecture Decisions (ADR)

## ADR-001: Single knowledge hub in repo

**Date**: 2026-09-01  
**Status**: Accepted  

`knowledge/` is the single source of truth for all IDEs and agents. Unlike Blue Ocean work rules (SRS in backend repo), this personal project keeps planning docs in-repo because the repo *is* the product.

---

## ADR-002: Monorepo with npm workspaces

**Date**: 2026-09-01  
**Status**: Accepted  

One repo: `shared`, `core`, `mcp`, `api`. Matches `blueocean_mcp` structure.

---

## ADR-003: Antigravity for IDE, Grok for MCP agent

**Date**: 2026-09-01  
**Status**: Accepted  

Split tools by strength. Cursor PM for reviews only.

---

## ADR-004: Notion as transaction source of truth

**Date**: 2026-09-01  
**Status**: Accepted  

Email is input; Notion Transactions DB is canonical store. Postgres cache optional in Phase 3.

---

## ADR-005: Copy blueocean_mcp, don't fork

**Date**: 2026-09-01  
**Status**: Accepted  

Work repo stays separate. Personal repo copies code to avoid coupling.

---

## Template

```
## ADR-NNN: Title
**Date**: YYYY-MM-DD
**Status**: Proposed | Accepted | Superseded
**Context**: ...
**Decision**: ...
**Consequences**: ...
```
