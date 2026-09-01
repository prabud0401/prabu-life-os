import { Router, type Request, type Response } from "express";
import { isAuthenticated, pingDatabase } from "@prabu-life-os/shared";
import { getOutlookAuthConfig, initOutlookConfig } from "@prabu-life-os/core";

export const healthRouter = Router();

async function ensureOutlookConfig() {
  await initOutlookConfig();
  return getOutlookAuthConfig();
}

/**
 * GET /api/health
 * Public health check endpoint indicating database and Outlook connectivity.
 */
healthRouter.get("/", async (_req: Request, res: Response) => {
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
    status: "ok",
    service: "prabu-life-os-api",
    database,
    outlook,
    outlookError,
    timestamp: new Date().toISOString(),
  });
});
