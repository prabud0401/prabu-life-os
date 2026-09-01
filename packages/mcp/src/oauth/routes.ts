import type { Express, Request, Response } from "express";
import express from "express";
import { generateToken } from "@prabu-life-os/api";
import {
  getIssuer,
  getMcpResourceUrl,
  getPublicBaseUrl,
  MCP_SCOPE,
  getDefaultOAuthClient,
} from "./config";
import {
  consumeAuthCode,
  createAuthCode,
  getOAuthClient,
  isRedirectUriAllowed,
  registerDynamicClient,
  verifyPkce,
} from "./store";

function resourceMetadata() {
  const resource = getMcpResourceUrl();
  return {
    resource,
    authorization_servers: [getIssuer()],
    scopes_supported: [MCP_SCOPE],
    bearer_methods_supported: ["header"],
    resource_documentation: `${getPublicBaseUrl()}/docs/api-spec.md`,
  };
}

function authorizationServerMetadata() {
  const base = getPublicBaseUrl();
  return {
    issuer: getIssuer(),
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    registration_endpoint: `${base}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: [
      "client_secret_post",
      "client_secret_basic",
      "none",
    ],
    scopes_supported: [MCP_SCOPE],
  };
}

function parseClientCredentials(req: Request): {
  clientId?: string;
  clientSecret?: string;
} {
  const body = req.body as Record<string, string>;
  let clientId = body.client_id;
  let clientSecret = body.client_secret;

  const auth = req.headers.authorization;
  if (auth?.startsWith("Basic ")) {
    const decoded = Buffer.from(auth.slice(6), "base64").toString("utf8");
    const [id, secret] = decoded.split(":");
    clientId = clientId || id;
    clientSecret = clientSecret || secret;
  }

  return { clientId, clientSecret };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function registerMcpOAuthRoutes(app: Express): void {
  const formParser = express.urlencoded({ extended: false });

  app.get("/.well-known/oauth-protected-resource", (_req, res) => {
    res.json(resourceMetadata());
  });

  app.get("/.well-known/oauth-protected-resource/mcp", (_req, res) => {
    res.json(resourceMetadata());
  });

  app.get("/.well-known/oauth-authorization-server", (_req, res) => {
    res.json(authorizationServerMetadata());
  });

  app.post("/oauth/register", (req, res) => {
    const client = registerDynamicClient({
      redirect_uris: req.body?.redirect_uris,
      client_name: req.body?.client_name,
    });
    res.status(201).json({
      client_id: client.clientId,
      client_secret: client.clientSecret,
      client_name: client.clientName,
      redirect_uris: client.redirectUris,
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "client_secret_post",
    });
  });

  app.get("/oauth/authorize", (req: Request, res: Response) => {
    const responseType = String(req.query.response_type || "");
    const clientId = String(req.query.client_id || "");
    const redirectUri = String(req.query.redirect_uri || "");
    const state = String(req.query.state || "");
    const codeChallenge = String(req.query.code_challenge || "");
    const codeChallengeMethod = String(req.query.code_challenge_method || "S256");
    const resource = req.query.resource ? String(req.query.resource) : "";
    const scope = String(req.query.scope || MCP_SCOPE);

    if (responseType !== "code") {
      res.status(400).send("Unsupported response_type");
      return;
    }

    const client = getOAuthClient(clientId);
    if (!client || !redirectUri || !isRedirectUriAllowed(client, redirectUri)) {
      res.status(400).send("Invalid client_id or redirect_uri");
      return;
    }

    if (!codeChallenge) {
      res.status(400).send("PKCE code_challenge is required");
      return;
    }

    res.send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Authorize Gemini</title></head>
<body style="font-family:system-ui;max-width:520px;margin:48px auto;padding:0 16px">
  <h2>Connect Gemini to Prabu Life OS</h2>
  <p>Allow <strong>${escapeHtml(client.clientName || clientId)}</strong> to use your MCP tools.</p>
  <form method="POST" action="/oauth/authorize/approve">
    <input type="hidden" name="client_id" value="${escapeHtml(clientId)}" />
    <input type="hidden" name="redirect_uri" value="${escapeHtml(redirectUri)}" />
    <input type="hidden" name="state" value="${escapeHtml(state)}" />
    <input type="hidden" name="code_challenge" value="${escapeHtml(codeChallenge)}" />
    <input type="hidden" name="code_challenge_method" value="${escapeHtml(codeChallengeMethod)}" />
    <input type="hidden" name="scope" value="${escapeHtml(scope)}" />
    <input type="hidden" name="resource" value="${escapeHtml(resource)}" />
    <button type="submit" style="padding:10px 18px;font-size:16px">Allow access</button>
  </form>
</body></html>`);
  });

  app.post("/oauth/authorize/approve", formParser, (req: Request, res: Response) => {
    const clientId = String(req.body.client_id || "");
    const redirectUri = String(req.body.redirect_uri || "");
    const state = String(req.body.state || "");
    const codeChallenge = String(req.body.code_challenge || "");
    const codeChallengeMethod = String(req.body.code_challenge_method || "S256");
    const resource = req.body.resource ? String(req.body.resource) : undefined;
    const scope = String(req.body.scope || MCP_SCOPE);

    const client = getOAuthClient(clientId);
    if (!client || !redirectUri || !isRedirectUriAllowed(client, redirectUri)) {
      res.status(400).send("Invalid client");
      return;
    }

    const code = createAuthCode({
      clientId,
      redirectUri,
      codeChallenge,
      codeChallengeMethod,
      resource,
      scope,
    });

    const target = new URL(redirectUri);
    target.searchParams.set("code", code);
    if (state) target.searchParams.set("state", state);
    res.redirect(target.toString());
  });

  app.post("/oauth/token", formParser, (req: Request, res: Response) => {
    const grantType = String(req.body.grant_type || "");
    const { clientId, clientSecret } = parseClientCredentials(req);

    if (!clientId) {
      res.status(400).json({ error: "invalid_client" });
      return;
    }

    const client = getOAuthClient(clientId);
    if (!client) {
      res.status(400).json({ error: "invalid_client" });
      return;
    }

    if (clientSecret && clientSecret !== client.clientSecret) {
      res.status(401).json({ error: "invalid_client" });
      return;
    }

    if (grantType === "authorization_code") {
      const code = String(req.body.code || "");
      const redirectUri = String(req.body.redirect_uri || "");
      const codeVerifier = String(req.body.code_verifier || "");
      const record = consumeAuthCode(code);

      if (!record || record.clientId !== clientId || record.redirectUri !== redirectUri) {
        res.status(400).json({ error: "invalid_grant" });
        return;
      }

      if (!verifyPkce(record.codeChallenge, record.codeChallengeMethod, codeVerifier)) {
        res.status(400).json({ error: "invalid_grant", error_description: "PKCE mismatch" });
        return;
      }

      const accessToken = generateToken(
        {
          sub: clientId,
          scope: record.scope,
          aud: getMcpResourceUrl(),
          client_id: clientId,
        },
        "7d"
      );

      res.json({
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 7 * 24 * 60 * 60,
        scope: record.scope,
      });
      return;
    }

    res.status(400).json({ error: "unsupported_grant_type" });
  });

  app.get("/oauth/gemini-setup", (_req, res) => {
    const defaults = getDefaultOAuthClient();
    res.json({
      mcpUrl: getMcpResourceUrl(),
      clientId: defaults.clientId,
      hasClientSecret: Boolean(process.env.MCP_OAUTH_CLIENT_SECRET),
      instructions: [
        "Gemini web → Settings → Connected Apps → Add custom app",
        `URL: ${getMcpResourceUrl()}`,
        "Advanced → Client ID and Client secret from Railway MCP_OAUTH_* vars",
      ],
    });
  });
}
