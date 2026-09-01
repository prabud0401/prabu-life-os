/**
 * Push local Outlook MSAL token cache to Railway Postgres via /auth/microsoft/bridge.
 *
 * Usage:
 *   node scripts/auth-outlook-bridge.js           # upload existing local token
 *   node scripts/auth-outlook-bridge.js --auth    # sign in locally first, then upload
 *   node scripts/auth-outlook-bridge.js --status  # check cloud /auth/status only
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
const CACHE_FILE = path.join(os.homedir(), ".blueocean-mcp", "outlook-tokens.json");
const MCP_NAME = "outlook";

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

async function authenticateLocally() {
  const { authenticateOutlook } = require("@prabu-life-os/core");
  console.log("Signing in locally (device code flow)...");
  console.log("Token will be saved to:", CACHE_FILE);
  await authenticateOutlook();
}

async function uploadLocalToken() {
  if (!API_KEY) {
    throw new Error("PRABU_MCP_API_KEY missing from .env");
  }

  if (!fs.existsSync(CACHE_FILE)) {
    throw new Error(
      `No local Outlook token at ${CACHE_FILE}. Run: npm run auth:outlook:bridge -- --auth`
    );
  }

  const teamsCacheFile = path.join(os.homedir(), ".blueocean-mcp", "teams-tokens.json");
  let cache = fs.readFileSync(CACHE_FILE, "utf8").trim();
  if (!cache && fs.existsSync(teamsCacheFile)) {
    console.warn("Outlook cache empty — falling back to teams token cache");
    cache = fs.readFileSync(teamsCacheFile, "utf8").trim();
  }
  if (!cache) {
    throw new Error("Local token file is empty");
  }

  console.log(`Uploading token to ${APP_URL}/auth/microsoft/bridge ...`);

  const result = await fetchJson(`${APP_URL}/auth/microsoft/bridge`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ cache, mcpName: MCP_NAME }),
  });

  console.log("Bridge response:", JSON.stringify(result, null, 2));

  if (!result.outlook && fs.existsSync(teamsCacheFile)) {
    const teamsCache = fs.readFileSync(teamsCacheFile, "utf8").trim();
    if (teamsCache && teamsCache !== cache) {
      console.warn("Outlook not authenticated — retrying with teams cache");
      const retry = await fetchJson(`${APP_URL}/auth/microsoft/bridge`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cache: teamsCache, mcpName: MCP_NAME }),
      });
      console.log("Retry response:", JSON.stringify(retry, null, 2));
    }
  }

  await checkStatus();
}

(async () => {
  const args = process.argv.slice(2);

  if (args.includes("--status")) {
    await checkStatus();
    return;
  }

  if (args.includes("--auth")) {
    await authenticateLocally();
  }

  await uploadLocalToken();
  console.log("\nDone. Cloud Outlook tools should work via prabu-life-os-remote.");
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
