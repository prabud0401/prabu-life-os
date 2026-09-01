import { Router, type Request, type Response } from "express";
import { isAuthenticated, pingDatabase } from "@prabu-life-os/shared";
import {
  getOutlookAuthConfig,
  initOutlookConfig,
  isGmailAuthenticated,
} from "@prabu-life-os/core";

export const healthRouter = Router();

async function ensureOutlookConfig() {
  await initOutlookConfig();
  return getOutlookAuthConfig();
}

/**
 * GET /api/health
 * Public health check endpoint indicating database, Outlook, and Gmail connectivity.
 */
healthRouter.get("/", async (_req: Request, res: Response) => {
  const database = await pingDatabase().catch(() => false);
  let outlook = false;
  let outlookError: string | undefined;
  let gmail = false;

  try {
    const config = await ensureOutlookConfig();
    outlook = await isAuthenticated(config);
  } catch (err) {
    outlookError = (err as Error).message;
  }

  try {
    gmail = await isGmailAuthenticated();
  } catch {
    gmail = false;
  }

  res.json({
    status: "ok",
    service: "prabu-life-os-api",
    database,
    outlook,
    gmail,
    outlookError,
    timestamp: new Date().toISOString(),
  });
});
