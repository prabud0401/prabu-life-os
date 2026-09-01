/**
 * Push local Gmail OAuth token to Railway Postgres via /auth/gmail/bridge.
 *
 * Usage:
 *   node scripts/auth-gmail-bridge.js           # upload existing local token (~/.gmail-mcp/credentials.json)
 *   node scripts/auth-gmail-bridge.js --status  # check cloud /auth/status only
 */
const fs = require("fs");
const path = require("path");
const os = require("os");

require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
  override: true,
});

const APP_URL =
  process.env.RAILWAY_APP_URL ||
  "https://prabu-life-os-production.up.railway.app";
const API_KEY = process.env.PRABU_MCP_API_KEY;

function getCredentialsFile() {
  if (process.env.GMAIL_CREDENTIALS_PATH) {
    const p = process.env.GMAIL_CREDENTIALS_PATH;
    return p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : path.resolve(p);
  }
  return path.join(os.homedir(), ".gmail-mcp", "credentials.json");
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(data.error || data.raw || res.statusText);
  }
  return data;
}

async function checkStatus() {
  const status = await fetchJson(`${APP_URL}/auth/status`);
  console.log("Cloud auth status:", JSON.stringify(status, null, 2));
  return status;
}

async function uploadLocalToken() {
  if (!API_KEY) {
    throw new Error("PRABU_MCP_API_KEY missing from .env");
  }

  const credentialsFile = getCredentialsFile();

  if (!fs.existsSync(credentialsFile)) {
    throw new Error(
      `No local Gmail credentials at ${credentialsFile}. Ensure Gmail local MCP is authenticated.`
    );
  }

  const content = fs.readFileSync(credentialsFile, "utf8").trim();
  if (!content) {
    throw new Error(`Gmail credentials file at ${credentialsFile} is empty`);
  }

  let credentials;
  try {
    credentials = JSON.parse(content);
  } catch (err) {
    throw new Error(`Invalid JSON in Gmail credentials file: ${err.message}`);
  }

  console.log(`Uploading Gmail token from ${credentialsFile} to ${APP_URL}/auth/gmail/bridge ...`);

  const result = await fetchJson(`${APP_URL}/auth/gmail/bridge`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ credentials }),
  });

  console.log("Bridge response:", JSON.stringify(result, null, 2));
  await checkStatus();
}

(async () => {
  const args = process.argv.slice(2);

  if (args.includes("--status")) {
    await checkStatus();
    return;
  }

  await uploadLocalToken();
  console.log("\nDone. Cloud Gmail tokens uploaded successfully to Postgres.");
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
