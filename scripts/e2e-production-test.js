/**
 * End-to-end production test against Railway with real data.
 * Usage: node scripts/e2e-production-test.js [baseUrl]
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const BASE_URL =
  process.argv[2] ||
  process.env.RAILWAY_APP_URL ||
  "https://prabu-life-os-production.up.railway.app";
const API_KEY = process.env.PRABU_MCP_API_KEY;

const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function api(path, options = {}) {
  const url = `${BASE_URL.replace(/\/$/, "")}${path}`;
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers || {}),
  };
  if (API_KEY && !options.skipAuth) {
    headers.Authorization = `Bearer ${API_KEY}`;
  }
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { res, data };
}

async function main() {
  if (!API_KEY) {
    console.error("Missing PRABU_MCP_API_KEY in .env");
    process.exit(1);
  }

  console.log(`\nPrabu Life OS — E2E Production Test`);
  console.log(`Target: ${BASE_URL}\n`);

  // --- Health ---
  try {
    const { res, data } = await api("/health");
    if (res.ok && data.status === "ok") pass("health", data.service);
    else fail("health", JSON.stringify(data).slice(0, 100));
  } catch (e) {
    fail("health", e.message);
  }

  try {
    const { res, data } = await api("/api/health");
    if (res.ok && data.status === "ok") {
      pass("api_health", `outlook=${data.outlook} teams=${data.teams} gmail=${data.gmail}`);
    } else fail("api_health", JSON.stringify(data).slice(0, 100));
  } catch (e) {
    fail("api_health", e.message);
  }

  try {
    const { res, data } = await api("/auth/status", { skipAuth: true });
    if (res.ok) pass("auth_status", `outlook=${data.outlook} teams=${data.teams} gmail=${data.gmail}`);
    else fail("auth_status", JSON.stringify(data).slice(0, 100));
  } catch (e) {
    fail("auth_status", e.message);
  }

  // --- JWT auth ---
  let jwt;
  try {
    const { res, data } = await api("/api/auth/token", {
      method: "POST",
      skipAuth: true,
      body: JSON.stringify({ apiKey: API_KEY }),
    });
    if (res.ok && data.token) {
      jwt = data.token;
      pass("jwt_auth", `expires ${data.expiresIn}s`);
    } else fail("jwt_auth", JSON.stringify(data).slice(0, 100));
  } catch (e) {
    fail("jwt_auth", e.message);
  }

  // --- Finance: real reconciliation report ---
  try {
    const { res, data } = await api("/api/finance/intelligence/report");
    if (res.ok && data.summary) {
      const s = data.summary;
      pass(
        "reconciliation_report",
        `txs=${s.transactionCount} salary=${s.salaryLkr} net=${s.netPersonalSavingsLkr} broker_net=${s.brokerNetPositionLkr ?? "n/a"}`
      );
      if (typeof s.brokerNetPositionLkr === "number") {
        pass("finance_broker_net_position", `LKR ${s.brokerNetPositionLkr}`);
      }
      if (typeof s.pairedSelfTransfersLkr === "number") {
        pass("finance_paired_transfers", `LKR ${s.pairedSelfTransfersLkr}`);
      }
      if (data.scenarios?.length >= 3) {
        pass("finance_scenarios", `${data.scenarios.length} scenarios`);
      } else {
        fail("finance_scenarios", "missing scenarios");
      }
    } else fail("reconciliation_report", JSON.stringify(data).slice(0, 150));
  } catch (e) {
    fail("reconciliation_report", e.message);
  }

  // --- Finance: classification samples ---
  const classifyCases = [
    {
      name: "classify_internal_transfer",
      body: {
        description: "JustPay transfer to HNB",
        amountLkr: 50000,
        direction: "debit",
        accountId: "134200130040916",
        counterparty: "028020612034",
      },
      expect: "INTERNAL_TRANSFER",
    },
    {
      name: "classify_broker_partner",
      body: {
        description: "Payment to Rajendiran partner share",
        amountLkr: 15000,
        direction: "debit",
      },
      expect: "BROKER_PARTNER_PAYOUT",
    },
    {
      name: "classify_pawn",
      body: {
        description: "Pawn shop gold interest",
        amountLkr: 8000,
        direction: "debit",
      },
      expect: "PAWN_PAYMENT",
    },
    {
      name: "classify_loan",
      body: {
        description: "Loan to friend Kasun",
        amountLkr: 25000,
        direction: "debit",
      },
      expect: "LOAN_GIVEN",
    },
  ];

  for (const tc of classifyCases) {
    try {
      const { res, data } = await api("/api/finance/intelligence/classify", {
        method: "POST",
        body: JSON.stringify(tc.body),
      });
      if (res.ok && data.transactionType === tc.expect) {
        pass(tc.name, data.transactionType);
      } else {
        fail(tc.name, `got ${data.transactionType}, expected ${tc.expect}`);
      }
    } catch (e) {
      fail(tc.name, e.message);
    }
  }

  // --- Finance: registered accounts ---
  try {
    const { res, data } = await api("/api/finance/intelligence/accounts");
    if (res.ok && Array.isArray(data.accounts) && data.accounts.length >= 8) {
      pass("registered_accounts", `${data.accounts.length} accounts`);
    } else fail("registered_accounts", JSON.stringify(data).slice(0, 100));
  } catch (e) {
    fail("registered_accounts", e.message);
  }

  // --- Finance: income summary (Notion) ---
  try {
    const { res, data } = await api("/api/finance/summary");
    if (res.ok && data.totalLkr > 0) {
      pass("income_summary", `LKR ${data.totalLkr} (${data.salaryCount} transfers)`);
    } else fail("income_summary", JSON.stringify(data).slice(0, 100));
  } catch (e) {
    fail("income_summary", e.message);
  }

  // --- Real data sync (Gmail + Outlook) ---
  try {
    const { res, data } = await api("/api/finance/intelligence/sync/gmail", {
      method: "POST",
      body: JSON.stringify({ maxPerQuery: 15 }),
    });
    if (res.ok) {
      pass("sync_gmail", `inserted=${data.inserted} skipped=${data.skipped} pdfs=${data.pdfInserted ?? 0}`);
    } else fail("sync_gmail", JSON.stringify(data).slice(0, 150));
  } catch (e) {
    fail("sync_gmail", e.message);
  }

  try {
    const { res, data } = await api("/api/finance/intelligence/sync/outlook", {
      method: "POST",
      body: JSON.stringify({ maxPerQuery: 15 }),
    });
    if (res.ok) {
      pass("sync_outlook", `inserted=${data.inserted} skipped=${data.skipped} pdfs=${data.pdfInserted ?? 0}`);
    } else fail("sync_outlook", JSON.stringify(data).slice(0, 150));
  } catch (e) {
    fail("sync_outlook", e.message);
  }

  // --- Re-run report after sync ---
  try {
    const { res, data } = await api("/api/finance/intelligence/report");
    if (res.ok && data.summary?.transactionCount > 0) {
      pass("reconciliation_after_sync", `${data.summary.transactionCount} transactions`);
    } else {
      fail("reconciliation_after_sync", "no transactions in ledger");
    }
  } catch (e) {
    fail("reconciliation_after_sync", e.message);
  }

  // --- PM Tool ---
  try {
    const { res, data } = await api("/api/pm/tasks?limit=3");
    if (res.ok && Array.isArray(data.tasks ?? data)) {
      const tasks = data.tasks ?? data;
      pass("pm_tasks", `${tasks.length} tasks`);
    } else fail("pm_tasks", JSON.stringify(data).slice(0, 100));
  } catch (e) {
    fail("pm_tasks", e.message);
  }

  // --- Cursor Assistant ---
  try {
    const { res, data } = await api("/api/assistant/health", { skipAuth: true });
    if (res.ok && data.configured) {
      pass("assistant_health", `model=${data.model}`);
    } else fail("assistant_health", JSON.stringify(data).slice(0, 100));
  } catch (e) {
    fail("assistant_health", e.message);
  }

  // --- SMS ingest smoke test ---
  try {
    const { res, data } = await api("/api/finance/intelligence/ingest/sms", {
      method: "POST",
      body: JSON.stringify({
        sender: "PEOPLESBANK",
        text: "Your account 134200130040916 credited with LKR 1,000.00",
      }),
    });
    if (res.ok) pass("ingest_sms", `inserted=${data.inserted}`);
    else fail("ingest_sms", JSON.stringify(data).slice(0, 100));
  } catch (e) {
    fail("ingest_sms", e.message);
  }

  // --- Summary ---
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log(`\n========================================`);
  console.log(`E2E Results: ${passed}/${results.length} passed`);
  if (failed.length) {
    console.log(`Failed (${failed.length}):`);
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
    console.log(`========================================\n`);
    process.exit(1);
  }
  console.log("All E2E tests passed.");
  console.log(`========================================\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
