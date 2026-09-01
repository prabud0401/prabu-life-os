# Email Sources

## Outlook — salary (primary)

| Field | Value |
|-------|-------|
| MCP | `user-outlook` (stdio) |
| Local path | `D:/BlueOcean main/blueocean_mcp/mcps/outlook/dist/index.js` |
| Sender | `brbangalore@blueoceansp.ai` |
| Search | `from:brbangalore Transfer sent` |
| Alt search | `from:brbangalore Your money's been sent` |

### Extract from Wise email body

- `Amount: XXX.XX USD`
- `LKR is now in` or `LKR is on its way` → LKR amount
- `Transfer Number: #XXXXXXXX`
- `Rate: 1 USD = XXX LKR`
- Date from email header

### Categories

| Signal | Category |
|--------|----------|
| Regular bi-weekly transfer | Salary |
| Barath note "year-end" / "appreciation" (e.g. Jan 1) | Bonus |
| First payments (no FW email) | Salary — note in Notes |

---

## Gmail — personal

| Field | Value |
|-------|-------|
| MCP | `user-gmail-local` (stdio) |
| Path | `D:/tools/gmail-mcp-server/dist/index.js` |
| Search | `from:wise`, `bank alert`, `payment received` |

Use for: bank alerts, personal receipts, non-work Wise notifications.

---

## Teams — work context

| Field | Value |
|-------|-------|
| MCP | `user-teams` (stdio) |
| Path | `D:/BlueOcean main/blueocean_mcp/mcps/teams/dist/index.js` |

Use for: work discussions (not primary finance source).

---

## First payments (no Wise FW in Outlook)

From user email 2025-08-04:

- Test: 2,482 LKR
- Main: 58,175 LKR
- Total: 60,657 LKR (~$200.17)
- Earned: 89h 18m @ $2.50/hr = $223.25

Record as single row or two rows — prefer one row with Notes breakdown.

---

## Lifetime totals (reference, Sep 2026)

- **32 transfers** Aug 2025 → Aug 2026
- **~2,648,425 LKR** / **~8,490 USD**
