# Prabu Life OS — REST API Specification

This document details the REST API endpoints provided by `@prabu-life-os/api` in **Prabu Life OS** (Phase 4).

## Base URLs

- **Local Development**: `http://localhost:3000/api` (mounted on MCP unified server) or `http://localhost:3001/api` (standalone)
- **Production (Railway)**: `https://prabu-life-os-production.up.railway.app/api`

---

## Authentication

All protected endpoints require authentication via either:
1. **Short-lived Bearer JWT** obtained via `POST /api/auth/token`
2. **Direct API Key** via `Authorization: Bearer <PRABU_MCP_API_KEY>` or header `x-api-key: <PRABU_MCP_API_KEY>`

```
Authorization: Bearer <JWT_OR_API_KEY>
```

---

## Endpoints

### 1. Health Check

Public health status showing database and Outlook connectivity.

- **Method**: `GET`
- **Path**: `/api/health`
- **Authentication**: None (Public)

#### Request
```bash
curl -X GET https://prabu-life-os-production.up.railway.app/api/health
```

#### Response (200 OK)
```json
{
  "status": "ok",
  "service": "prabu-life-os-api",
  "database": true,
  "outlook": true,
  "timestamp": "2026-09-01T13:45:00.000Z"
}
```

---

### 2. Exchange API Key for JWT

Exchanges `PRABU_MCP_API_KEY` for a short-lived JWT valid for 1 hour.

- **Method**: `POST`
- **Path**: `/api/auth/token`
- **Authentication**: None (Requires valid API key in payload or headers)

#### Request
```bash
curl -X POST https://prabu-life-os-production.up.railway.app/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "YOUR_PRABU_MCP_API_KEY"}'
```

#### Response (200 OK)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "user": {
    "sub": "prabu-life-os-user",
    "role": "admin"
  }
}
```

#### Error Response (401 Unauthorized)
```json
{
  "error": "Invalid or missing API key. Provide apiKey in request body or Authorization header."
}
```

---

### 3. Income & Salary Summary

Fetches aggregated income metrics (total USD, total LKR, transfer count, monthly breakdown) from the Notion Transactions DB.

- **Method**: `GET`
- **Path**: `/api/finance/summary`
- **Authentication**: Required (`Bearer <JWT>` or `Bearer <API_KEY>`)

#### Query Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `fromDate` | `string` | No | ISO date string (`YYYY-MM-DD`) filter start |
| `toDate` | `string` | No | ISO date string (`YYYY-MM-DD`) filter end |

#### Request
```bash
curl -X GET "https://prabu-life-os-production.up.railway.app/api/finance/summary?fromDate=2026-01-01" \
  -H "Authorization: Bearer YOUR_JWT_OR_API_KEY"
```

#### Response (200 OK)
```json
{
  "totalUsd": 8490.73,
  "totalLkr": 2648425.18,
  "transferCount": 31,
  "salaryCount": 30,
  "bonusCount": 1,
  "firstTransferDate": "2025-08-04",
  "lastTransferDate": "2026-09-01",
  "monthlyBreakdown": [
    {
      "month": "2026-01",
      "usd": 687.67,
      "lkr": 210082.09,
      "count": 3
    },
    {
      "month": "2026-02",
      "usd": 575.71,
      "lkr": 176918.14,
      "count": 2
    }
  ]
}
```

---

### 4. Trigger Salary Sync

Scans Outlook for Wise transfer forwards, parses amounts, deduplicates against existing records, and writes new rows to the Notion Transactions DB.

- **Method**: `POST`
- **Path**: `/api/finance/sync`
- **Authentication**: Required (`Bearer <JWT>` or `Bearer <API_KEY>`)

#### Request Body
| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `dryRun` | `boolean` | No | `false` | When `true`, parses transfers without inserting into Notion |
| `force` | `boolean` | No | `false` | When `true`, ignores deduplication and syncs all |
| `since` | `string` | No | `undefined` | Filter emails received on or after date (`YYYY-MM-DD`) |
| `count` | `number` | No | `undefined` | Limit number of transfers to process |

#### Request
```bash
curl -X POST https://prabu-life-os-production.up.railway.app/api/finance/sync \
  -H "Authorization: Bearer YOUR_JWT_OR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false}'
```

#### Response (200 OK)
```json
{
  "totalFound": 31,
  "newTransfers": 0,
  "skippedCount": 31,
  "insertedCount": 0,
  "errors": [],
  "items": [],
  "dryRun": false
}
```

---

### 5. List Transactions

Queries all transactions from the Notion Transactions database with optional filtering and pagination.

- **Method**: `GET`
- **Path**: `/api/transactions`
- **Authentication**: Required (`Bearer <JWT>` or `Bearer <API_KEY>`)

#### Query Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `limit` | `number` | No | Limit number of records returned |
| `type` | `string` | No | Filter by transaction type (`Income`, `Expense`) |
| `category` | `string` | No | Filter by category (`Salary`, `Bonus`, etc.) |

#### Request
```bash
curl -X GET "https://prabu-life-os-production.up.railway.app/api/transactions?limit=2" \
  -H "Authorization: Bearer YOUR_JWT_OR_API_KEY"
```

#### Response (200 OK)
```json
{
  "total": 31,
  "count": 2,
  "transactions": [
    {
      "id": "3ce460e4-5a48-81ac-a42e-c174c0deb15f",
      "name": "Salary — Wise #2339987406",
      "date": "2026-09-01",
      "amount": 260.18,
      "currency": "USD",
      "amountLkr": 84237.81,
      "type": "Income",
      "category": "Salary",
      "source": "Outlook",
      "notes": "LKR 84,237.81. Transfer #2339987406. Rate: 1 USD = 327.965 LKR. Barath FW.",
      "transferId": "2339987406"
    },
    {
      "id": "3ce460e4-5a48-81e6-a190-e919efb48f61",
      "name": "Salary — Wise #2313496823",
      "date": "2026-08-16",
      "amount": 255.97,
      "currency": "USD",
      "amountLkr": 84070.89,
      "type": "Income",
      "category": "Salary",
      "source": "Outlook",
      "notes": "LKR 84,070.89. Transfer #2313496823. Rate: 1 USD = 328.445 LKR. Barath FW.",
      "transferId": "2313496823"
    }
  ]
}
```

---

### 6. PM Tool Health Check

Inspects PM Tool proxy configuration and base URL.

- **Method**: `GET`
- **Path**: `/api/pm/health`
- **Authentication**: None (Public)

#### Response (200 OK)
```json
{
  "status": "ok",
  "service": "pm-tool-proxy",
  "configured": true,
  "baseUrl": "https://pm.blueoceansp.ai/api",
  "hasToken": true,
  "timestamp": "2026-09-01T13:45:00.000Z"
}
```

---

### 7. List PM Tasks

Lists assigned tasks from the PM tool with optional status, project, and sprint filters.

- **Method**: `GET`
- **Path**: `/api/pm/tasks`
- **Authentication**: Required (`Bearer <JWT>` or `Bearer <API_KEY>`)

#### Query Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `status` | `string` | No | Task status filter (`todo`, `inprogress`, `done`, `blocked`) |
| `project` | `string` | No | Project filter (`sales`, `engineering`, etc.) |
| `sprint` | `string` | No | Sprint filter (e.g. `'Sprint 11'`) |
| `limit` | `number` | No | Maximum number of tasks to return |

#### Request
```bash
curl -X GET "https://prabu-life-os-production.up.railway.app/api/pm/tasks?project=sales&status=todo" \
  -H "Authorization: Bearer YOUR_JWT_OR_API_KEY"
```

---

### 8. Get PM Task Details

Fetches task details by task ID.

- **Method**: `GET`
- **Path**: `/api/pm/tasks/:id`
- **Authentication**: Required (`Bearer <JWT>` or `Bearer <API_KEY>`)

#### Request
```bash
curl -X GET "https://prabu-life-os-production.up.railway.app/api/pm/tasks/2452" \
  -H "Authorization: Bearer YOUR_JWT_OR_API_KEY"
```

---

### 9. Search PM Tasks

Searches tasks in PM tool by keyword query.

- **Method**: `GET`
- **Path**: `/api/pm/search`
- **Authentication**: Required (`Bearer <JWT>` or `Bearer <API_KEY>`)

#### Query Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `q` | `string` | Yes | Search keyword or query string |
| `project` | `string` | No | Optional project filter |

#### Request
```bash
curl -X GET "https://prabu-life-os-production.up.railway.app/api/pm/search?q=oscar&project=sales" \
  -H "Authorization: Bearer YOUR_JWT_OR_API_KEY"
```
