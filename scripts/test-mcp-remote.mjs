import crypto from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { CallToolResultSchema, ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";

const BASE = process.env.MCP_BASE_URL || "https://prabu-life-os-production.up.railway.app";
const MCP_URL = `${BASE}/mcp`;
const API_KEY = process.env.PRABU_MCP_API_KEY;
const CLIENT_ID = process.env.MCP_OAUTH_CLIENT_ID || "prabu-life-os-gemini";
const CLIENT_SECRET = process.env.MCP_OAUTH_CLIENT_SECRET;

function pkcePair() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

async function mcpSession(label, headers) {
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
    requestInit: { headers },
  });
  const client = new Client({ name: "mcp-smoke-test", version: "0.1.0" });
  await client.connect(transport);

  const tools = await client.request({ method: "tools/list", params: {} }, ListToolsResultSchema);
  const income = await client.request(
    {
      method: "tools/call",
      params: { name: "get_income_summary", arguments: {} },
    },
    CallToolResultSchema
  );

  await client.close();
  return { label, toolCount: tools.tools.length, toolNames: tools.tools.map((t) => t.name), income };
}

async function oauthAccessToken() {
  const redirectUri = "http://127.0.0.1:9876/callback";
  const { verifier, challenge } = pkcePair();
  const form = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    state: "smoke-test",
    code_challenge: challenge,
    code_challenge_method: "S256",
    scope: "mcp:tools",
    resource: MCP_URL,
  });

  const approve = await fetch(`${BASE}/oauth/authorize/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
    redirect: "manual",
  });

  const location = approve.headers.get("location");
  if (!location) {
    throw new Error(`OAuth approve failed: HTTP ${approve.status}`);
  }
  const code = new URL(location).searchParams.get("code");
  if (!code) throw new Error("No authorization code in redirect");

  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code_verifier: verifier,
  });

  const tokenRes = await fetch(`${BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody.toString(),
  });
  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok) {
    throw new Error(`Token exchange failed: ${JSON.stringify(tokenJson)}`);
  }
  return tokenJson.access_token;
}

async function main() {
  const results = { base: BASE, mcpUrl: MCP_URL, tests: [] };

  const unauth = await fetch(MCP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
  });
  results.tests.push({
    name: "unauthenticated",
    status: unauth.status,
    wwwAuthenticate: unauth.headers.get("www-authenticate"),
  });

  if (!API_KEY) {
    console.log(JSON.stringify({ ...results, error: "Set PRABU_MCP_API_KEY to run authenticated tests" }, null, 2));
    return;
  }

  const apiKeyResult = await mcpSession("api_key", {
    Authorization: `Bearer ${API_KEY}`,
    Accept: "application/json, text/event-stream",
  });
  results.tests.push({ name: "api_key_mcp", ok: true, ...apiKeyResult });

  if (!CLIENT_SECRET) {
    console.log(JSON.stringify({ ...results, note: "Set MCP_OAUTH_CLIENT_SECRET for OAuth test" }, null, 2));
    return;
  }

  const accessToken = await oauthAccessToken();
  const oauthResult = await mcpSession("oauth_jwt", {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json, text/event-stream",
  });
  results.tests.push({ name: "oauth_mcp", ok: true, ...oauthResult });

  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
