/**
 * Full MCP integration test against production (or local) Streamable HTTP endpoint.
 * Usage: node scripts/mcp-full-test.js [baseUrl]
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const {
  StreamableHTTPClientTransport,
} = require("@modelcontextprotocol/sdk/client/streamableHttp.js");

const BASE_URL =
  process.argv[2] ||
  process.env.RAILWAY_APP_URL ||
  "https://prabu-life-os-production.up.railway.app";
const API_KEY = process.env.PRABU_MCP_API_KEY;
const MCP_URL = `${BASE_URL.replace(/\/$/, "")}/sse`;

const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function callTool(client, name, args = {}) {
  const res = await client.callTool({ name, arguments: args });
  const text = (res.content || [])
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");
  if (res.isError) {
    throw new Error(text.slice(0, 300));
  }
  return text;
}

async function main() {
  if (!API_KEY) {
    console.error("Missing PRABU_MCP_API_KEY in .env");
    process.exit(1);
  }

  console.log(`\nPrabu Life OS — Full MCP Test`);
  console.log(`Endpoint: ${MCP_URL}\n`);

  const client = new Client({ name: "mcp-full-test", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
    requestInit: {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    },
  });

  try {
    await client.connect(transport);
    pass("mcp_connect");
  } catch (err) {
    fail("mcp_connect", err.message);
    printSummary();
    process.exit(1);
  }

  // --- List tools ---
  try {
    const listed = await client.listTools();
    const names = listed.tools.map((t) => t.name).sort();
    const expectedMin = 30;
    if (names.length >= expectedMin) {
      pass("tools_list", `${names.length} tools`);
    } else {
      fail("tools_list", `only ${names.length} tools (expected >= ${expectedMin})`);
    }
    console.log(`        Tools: ${names.join(", ")}\n`);
  } catch (err) {
    fail("tools_list", err.message);
  }

  // --- Health via REST ---
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    if (data.status === "ok" && data.database) {
      pass("api_health", `outlook=${data.outlook} teams=${data.teams} gmail=${data.gmail}`);
    } else {
      fail("api_health", JSON.stringify(data));
    }
  } catch (err) {
    fail("api_health", err.message);
  }

  try {
    const res = await fetch(`${BASE_URL}/auth/status`);
    const data = await res.json();
    if (data.database && data.gmail) {
      pass("auth_status", `outlook=${data.outlook} teams=${data.teams} gmail=${data.gmail}`);
    } else {
      fail("auth_status", JSON.stringify(data));
    }
  } catch (err) {
    fail("auth_status", err.message);
  }

  console.log("\n--- Finance Intelligence ---");
  await testTool(client, "list_registered_accounts", {});
  await testTool(client, "classify_transaction", {
    description: "CEB Electricity Bill payment",
    amountLkr: 4500,
    direction: "debit",
  });
  await testTool(client, "run_financial_reconciliation", {
    fromDate: "2025-08-01",
    toDate: "2026-09-01",
  });
  await testTool(client, "ingest_sms_alert", {
    sender: "PEOPLESBANK",
    text: "Your a/c 134200130040916 has been credited with LKR 1,000.00 MCP TEST on 01-Sep-2026",
  });
  await testTool(client, "sync_finance_emails_from_gmail", { maxPerQuery: 2 });
  await testTool(client, "sync_finance_emails_from_outlook", { maxPerQuery: 2 });
  await testTool(client, "send_push_notification", {
    title: "MCP Test",
    body: "Full integration test ping",
  });

  console.log("\n--- Finance (Notion) ---");
  await testTool(client, "get_income_summary", {});

  console.log("\n--- Outlook ---");
  await testTool(client, "list_folders", {});
  let emailId;
  try {
    const raw = await callTool(client, "list_emails", { count: 3 });
    const parsed = JSON.parse(raw);
    emailId = parsed?.[0]?.id;
    pass("list_emails", `${parsed?.length ?? 0} messages`);
  } catch (err) {
    fail("list_emails", err.message);
  }
  await testTool(client, "search_emails", { query: "Transfer sent", count: 2 });
  if (emailId) {
    await testTool(client, "get_email", { id: emailId });
  } else {
    fail("get_email", "skipped — no email id from list");
  }

  console.log("\n--- Gmail ---");
  await testTool(client, "list_labels", {});
  let gmailId;
  try {
    const raw = await callTool(client, "list_messages", { maxResults: 3 });
    const parsed = JSON.parse(raw);
    gmailId = parsed?.messages?.[0]?.id;
    pass("list_messages", `${parsed?.messages?.length ?? 0} messages`);
  } catch (err) {
    fail("list_messages", err.message);
  }
  await testTool(client, "search_messages", {
    query: "Transfer sent",
    maxResults: 2,
  });
  if (gmailId) {
    await testTool(client, "read_message", { messageId: gmailId });
  } else {
    fail("read_message", "skipped — no message id");
  }

  console.log("\n--- Teams ---");
  let teamId;
  try {
    const raw = await callTool(client, "list_teams", {});
    const parsed = JSON.parse(raw);
    teamId = parsed?.[0]?.id;
    pass("list_teams", `${parsed?.length ?? 0} teams`);
  } catch (err) {
    fail("list_teams", err.message);
  }
  await testTool(client, "list_chats", {});
  if (teamId) {
    let channelId;
    try {
      const raw = await callTool(client, "list_channels", { teamId });
      const parsed = JSON.parse(raw);
      channelId = parsed?.[0]?.id;
      pass("list_channels", `${parsed?.length ?? 0} channels`);
    } catch (err) {
      fail("list_channels", err.message);
    }
    if (channelId) {
      await testTool(client, "list_channel_messages", { teamId, channelId, count: 3 });
    }
  } else {
    fail("list_channels", "skipped — no team id");
  }

  console.log("\n--- PM Tool ---");
  let taskId;
  try {
    const raw = await callTool(client, "list_my_tasks", { limit: 5 });
    const parsed = JSON.parse(raw);
    const tasks = Array.isArray(parsed)
      ? parsed
      : parsed?.tasks || parsed?.items || [];
    taskId = tasks?.[0]?.id ?? tasks?.[0]?.task_id;
    pass("list_my_tasks", `${tasks.length} tasks`);
  } catch (err) {
    fail("list_my_tasks", err.message);
  }
  try {
    const raw = await callTool(client, "search_tasks", { query: "study", limit: 3 });
    const parsed = JSON.parse(raw);
    const tasks = parsed?.tasks || parsed?.items || [];
    taskId = taskId ?? tasks?.[0]?.id ?? tasks?.[0]?.task_id;
    const preview = raw.replace(/\s+/g, " ").slice(0, 80);
    pass("search_tasks", preview);
  } catch (err) {
    fail("search_tasks", err.message.slice(0, 200));
  }
  if (taskId) {
    await testTool(client, "get_task", { taskId: String(taskId) });
  } else {
    fail("get_task", "skipped — no task id");
  }

  await transport.close();
  printSummary();
  process.exit(results.some((r) => !r.ok) ? 1 : 0);
}

async function testTool(client, name, args) {
  try {
    const raw = await callTool(client, name, args);
    const preview = raw.replace(/\s+/g, " ").slice(0, 80);
    pass(name, preview);
  } catch (err) {
    fail(name, err.message.slice(0, 200));
  }
}

function printSummary() {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log(`\n========================================`);
  console.log(`Results: ${passed}/${results.length} passed`);
  if (failed.length) {
    console.log(`Failed (${failed.length}):`);
    for (const f of failed) {
      console.log(`  - ${f.name}: ${f.detail}`);
    }
  } else {
    console.log("All tests passed.");
  }
  console.log(`========================================\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
