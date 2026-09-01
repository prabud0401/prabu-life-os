import type { Express, Request, Response } from "express";
import {
  acquireMicrosoftTokenByCode,
  getMicrosoftAuthUrl,
  isAuthenticated,
  pingDatabase,
} from "@prabu-life-os/shared";
import { getOutlookAuthConfig, initOutlookConfig } from "@prabu-life-os/core";

async function ensureOutlookConfig() {
  await initOutlookConfig();
  return getOutlookAuthConfig();
}

export function registerAuthRoutes(app: Express): void {
  app.get("/auth/status", async (_req: Request, res: Response) => {
    const database = await pingDatabase().catch(() => false);
    let outlook = false;
    let outlookError: string | undefined;

    try {
      const config = await ensureOutlookConfig();
      outlook = await isAuthenticated(config);
    } catch (err) {
      outlookError = (err as Error).message;
    }

    res.json({
      outlook,
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
