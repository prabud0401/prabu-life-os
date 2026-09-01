/**
 * Push local MSAL/OAuth tokens to Railway Postgres.
 *
 * Usage:
 *   node scripts/auth-token-bridge.js --all
 *   node scripts/auth-token-bridge.js --outlook --teams
 *   node scripts/auth-token-bridge.js --gmail
 *   node scripts/auth-token-bridge.js --status
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

const MSAL_TARGETS = {
  outlook: path.join(os.homedir(), ".blueocean-mcp", "outlook-tokens.json"),
  teams: path.join(os.homedir(), ".blueocean-mcp", "teams-tokens.json"),
};

function getGmailCredentialsFile() {
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

async function uploadMsal(mcpName, cacheFile) {
  if (!fs.existsSync(cacheFile)) {
    console.warn(`Skip ${mcpName}: no file at ${cacheFile}`);
    return;
  }
  const cache = fs.readFileSync(cacheFile, "utf8").trim();
  if (!cache) {
    console.warn(`Skip ${mcpName}: empty cache file`);
    return;
  }
  console.log(`Uploading ${mcpName} → /auth/microsoft/bridge`);
  const result = await fetchJson(`${APP_URL}/auth/microsoft/bridge`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ cache, mcpName }),
  });
  console.log(result);
}

async function uploadGmail() {
  const file = getGmailCredentialsFile();
  if (!fs.existsSync(file)) {
    console.warn(`Skip gmail: no file at ${file}`);
    return;
  }
  const raw = fs.readFileSync(file, "utf8").trim();
  let credentials;
  try {
    credentials = JSON.parse(raw);
  } catch {
    credentials = raw;
  }
  console.log(`Uploading gmail → /auth/gmail/bridge`);
  const result = await fetchJson(`${APP_URL}/auth/gmail/bridge`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ credentials }),
  });
  console.log(result);
}

(async () => {
  if (!API_KEY) throw new Error("PRABU_MCP_API_KEY missing from .env");

  const args = process.argv.slice(2);
  if (args.includes("--status")) {
    await checkStatus();
    return;
  }

  const all = args.includes("--all");
  const doOutlook = all || args.includes("--outlook");
  const doTeams = all || args.includes("--teams");
  const doGmail = all || args.includes("--gmail");

  if (!doOutlook && !doTeams && !doGmail) {
    await uploadMsal("outlook", MSAL_TARGETS.outlook);
    await uploadMsal("teams", MSAL_TARGETS.teams);
    await uploadGmail();
  } else {
    if (doOutlook) await uploadMsal("outlook", MSAL_TARGETS.outlook);
    if (doTeams) await uploadMsal("teams", MSAL_TARGETS.teams);
    if (doGmail) await uploadGmail();
  }

  await checkStatus();
  console.log("\nDone.");
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
