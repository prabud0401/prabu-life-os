const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { createApp, generateToken, verifyToken } = require("../dist");

describe("JWT Utilities", () => {
  it("generates and verifies valid JWT", () => {
    process.env.JWT_SECRET = "test-secret-key-12345";
    const token = generateToken({ sub: "user-test", role: "admin" }, 60);
    assert.ok(token);

    const payload = verifyToken(token);
    assert.ok(payload);
    assert.equal(payload.sub, "user-test");
    assert.equal(payload.role, "admin");
  });

  it("fails verification for invalid token", () => {
    const payload = verifyToken("invalid.token.string");
    assert.equal(payload, null);
  });
});

describe("REST API Endpoints", () => {
  let server;
  let baseUrl;
  const testApiKey = "prabu-api-key-test";

  before(() => {
    process.env.PRABU_MCP_API_KEY = testApiKey;
    process.env.JWT_SECRET = "jwt-secret-for-testing";

    const app = createApp();
    server = http.createServer(app);
    return new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(() => {
    return new Promise((resolve) => server.close(resolve));
  });

  it("GET /api/health returns health status", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, "ok");
    assert.equal(data.service, "prabu-life-os-api");
  });

  it("POST /api/auth/token rejects invalid API key", async () => {
    const res = await fetch(`${baseUrl}/api/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: "wrong-key" }),
    });
    assert.equal(res.status, 401);
  });

  it("POST /api/auth/token returns JWT for valid API key", async () => {
    const res = await fetch(`${baseUrl}/api/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: testApiKey }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.token);
    assert.equal(data.tokenType, "Bearer");
    assert.equal(data.expiresIn, 3600);
  });

  it("GET /api/pm/health returns PM proxy status", async () => {
    const res = await fetch(`${baseUrl}/api/pm/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, "ok");
    assert.equal(data.service, "pm-tool-proxy");
  });

  it("POST /api/finance/intelligence/ingest/pdf ingests raw statement text", async () => {
    const sampleText = `
HATTON NATIONAL BANK
15/09/2025 SALARY INWARD 84,237.81 150,000.00
`;
    const res = await fetch(`${baseUrl}/api/finance/intelligence/ingest/pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testApiKey}`,
      },
      body: JSON.stringify({ rawText: sampleText, bank: "HNB" }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.parsed);
    assert.equal(data.parsed.length, 1);
    assert.equal(data.parsed[0].amountLkr, 84237.81);
  });

  it("POST /api/finance/intelligence/devices/register registers device token", async () => {
    const res = await fetch(`${baseUrl}/api/finance/intelligence/devices/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testApiKey}`,
      },
      body: JSON.stringify({
        deviceToken: "ExponentPushToken[api-test-token]",
        platform: "ios",
        deviceName: "iPhone 15",
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
  });

  it("Protected routes reject unauthorized requests", async () => {
    const res = await fetch(`${baseUrl}/api/transactions`);
    assert.equal(res.status, 401);
  });
});
