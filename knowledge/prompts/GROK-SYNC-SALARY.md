# Grok CLI — Finance Sync Prompt

Use after `grok login` and `cd` to this repo.

---

Read `knowledge/RULES.md`, `knowledge/EMAIL-SOURCES.md`, and `knowledge/NOTION.md`.

Using Outlook MCP, search for all Barath salary transfers (`from:brbangalore Transfer sent`). For each transfer not already in Notion, add a row to Transactions data source `33423467-e1d3-4ebf-bd10-adfbe7e56b1d`.

Rules:
- Amount = USD, Currency = USD, note LKR in Notes
- Deduplicate by Transfer ID in Notes/Name
- Category: Salary (or Bonus if year-end note from Barath)

When done, update `knowledge/STATUS.md` metrics (row count) and `knowledge/CHANGELOG.md`.

Summarize total USD and LKR synced.
