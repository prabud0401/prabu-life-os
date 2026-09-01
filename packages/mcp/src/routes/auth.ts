import type { Express, Request, Response } from "express";
import {
  acquireMicrosoftTokenByCode,
  getMicrosoftAuthUrl,
  isAuthenticated,
  pingDatabase,
  upsertMsalTokenCache,
  upsertOAuth2Token,
} from "@prabu-life-os/shared";
import {
  getOutlookAuthConfig,
  initOutlookConfig,
  initTeamsConfig,
  getTeamsAuthConfig,
  isGmailAuthenticated,
} from "@prabu-life-os/core";
import { requireApiKey } from "../middleware/api-key";

async function ensureOutlookConfig() {
  await initOutlookConfig();
  return getOutlookAuthConfig();
}

async function ensureTeamsConfig() {
  await initTeamsConfig();
  return getTeamsAuthConfig();
}

export function registerAuthRoutes(app: Express): void {
  app.get("/auth/status", async (_req: Request, res: Response) => {
    const database = await pingDatabase().catch(() => false);
    let outlook = false;
    let teams = false;
    let outlookError: string | undefined;
    let gmail = false;

    try {
      const config = await ensureOutlookConfig();
      outlook = await isAuthenticated(config);
    } catch (err) {
      outlookError = (err as Error).message;
    }

    try {
      const teamsConfig = await ensureTeamsConfig();
      teams = await isAuthenticated(teamsConfig);
    } catch {
      teams = false;
    }

    try {
      gmail = await isGmailAuthenticated();
    } catch {
      gmail = false;
    }

    res.json({
      outlook,
      teams,
      gmail,
      database,
      oauthRedirectUri: process.env.OAUTH_REDIRECT_URI ?? null,
      outlookError,
    });
  });

  app.get("/auth/microsoft", async (_req: Request, res: Response) => {
    try {
      const config = await ensureOutlookConfig();
      const url = await getMicrosoftAuthUrl(config);
      res.redirect(url);
    } catch (err) {
      res.status(500).send(`Microsoft auth setup failed: ${(err as Error).message}`);
    }
  });

  /**
   * Push a local MSAL token cache (e.g. ~/.blueocean-mcp/outlook-tokens.json)
   * into Railway Postgres — no Azure redirect URI change required.
   */
  app.post(
    "/auth/microsoft/bridge",
    requireApiKey,
    async (req: Request, res: Response) => {
      const cache = req.body?.cache;
      const mcpName =
        typeof req.body?.mcpName === "string" && req.body.mcpName.trim()
          ? req.body.mcpName.trim()
          : "outlook";

      if (typeof cache !== "string" || !cache.trim()) {
        res.status(400).json({
          error: "Body must include cache (MSAL serialized token cache string)",
        });
        return;
      }

      try {
        await upsertMsalTokenCache(mcpName, cache);
        let outlook = false;
        let teams = false;
        if (mcpName === "teams") {
          const teamsConfig = await ensureTeamsConfig();
          teams = await isAuthenticated(teamsConfig).catch(() => false);
        } else {
          const config = await ensureOutlookConfig();
          outlook = await isAuthenticated(config).catch(() => false);
        }
        res.json({ ok: true, mcpName, outlook, teams });
      } catch (err) {
        res.status(500).json({ error: (err as Error).message });
      }
    }
  );

  /**
   * Push a local Gmail OAuth2 token (e.g. ~/.gmail-mcp/credentials.json)
   * into Railway Postgres (provider: oauth2, user_id: gmail).
   */
  app.post(
    "/auth/gmail/bridge",
    requireApiKey,
    async (req: Request, res: Response) => {
      const credentials = req.body?.credentials || req.body?.token || req.body?.cache;
      const provider = "oauth2";
      const userId = "gmail";

      if (!credentials) {
        res.status(400).json({
          error: "Body must include credentials (Gmail OAuth JSON string or object)",
        });
        return;
      }

      try {
        await upsertOAuth2Token(provider, userId, credentials);
        const gmail = await isGmailAuthenticated().catch(() => false);
        res.json({ ok: true, provider, user_id: userId, gmail });
      } catch (err) {
        res.status(500).json({ error: (err as Error).message });
      }
    }
  );

  app.get("/auth/microsoft/callback", async (req: Request, res: Response) => {
    const error = req.query.error as string | undefined;
    const code = req.query.code as string | undefined;

    if (error) {
      res.status(400).send(`Authentication failed: ${error}`);
      return;
    }

    if (!code) {
      res.status(400).send("Missing authorization code");
      return;
    }

    try {
      const config = await ensureOutlookConfig();
      await acquireMicrosoftTokenByCode(config, code);
      res
        .status(200)
        .send(
          "<html><body><h2>Outlook connected</h2><p>Token saved to Postgres. You can close this tab.</p></body></html>"
        );
    } catch (err) {
      res.status(500).send(`Token exchange failed: ${(err as Error).message}`);
    }
  });
}
