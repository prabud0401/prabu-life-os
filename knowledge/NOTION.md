# Notion Configuration

## Links

| Resource | URL |
|----------|-----|
| Finance Hub | https://app.notion.com/p/3ce460e45a4881618456ddb911c937c7 |
| Transactions DB | https://app.notion.com/p/44ec9720556c4e49a28beac28a487e30 |

## IDs (for MCP `notion-create-pages` / query)

| Resource | ID |
|----------|-----|
| Finance Hub page | `3ce460e4-5a48-8161-8456-ddb911c937c7` |
| Transactions database | `44ec9720-556c-4e49-a28b-eac28a487e30` |
| Transactions data source | `33423467-e1d3-4ebf-bd10-adfbe7e56b1d` |
| Parent (personal) | `17e460e4-5a48-80af-841b-d8d9c07eba1b` |

## Schema (Transactions)

| Property | Type | Values |
|----------|------|--------|
| Name | title | e.g. `Salary — Wise #2339987406` |
| Date | date | ISO date |
| Amount | number | Must match Currency |
| Currency | select | USD, LKR |
| Type | select | Income, Expense |
| Category | select | Salary, Bonus, Other |
| Source | select | Gmail, Outlook, Manual |
| Notes | text | LKR amount, Transfer ID, email ref |

## Row template (MCP)

```json
{
  "parent": { "data_source_id": "33423467-e1d3-4ebf-bd10-adfbe7e56b1d" },
  "pages": [{
    "properties": {
      "Name": "Salary — Wise #2339987406",
      "Type": "Income",
      "Category": "Salary",
      "Source": "Outlook",
      "Amount": 260.18,
      "Currency": "USD",
      "date:Date:start": "2026-08-30",
      "date:Date:is_datetime": 0,
      "Notes": "LKR 84,237.81. Transfer #2339987406. Barath FW."
    }
  }]
}
```

## Deduplication

Before insert: search Notion for Transfer ID in Notes or Name. Skip if exists.

## Auth

Use env var `NOTION_TOKEN` — never commit to git.

## Integration access (required)

Your Notion integration must be **connected** to the Transactions database:

1. Open [Transactions database](https://app.notion.com/p/44ec9720556c4e49a28beac28a487e30)
2. Click **⋯** (top right) → **Connections**
3. Add your integration (e.g. **prabudOS**)
4. Also connect it to [Finance Hub](https://app.notion.com/p/3ce460e45a4881618456ddb911c937c7) if needed

Without this step, API returns `404 object_not_found` even with a valid token.

## Live sync command

```powershell
cd C:\Users\prabu\Desktop\prabu-life-os
# NOTION_TOKEN in .env
node scripts/sync-salary-live.js
```

Or MCP tool: `sync_salary_to_notion` with `dryRun: false`.
