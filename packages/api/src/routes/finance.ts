import { Router, type Response } from "express";
import { getIncomeSummary, syncSalaryToNotion } from "@prabu-life-os/core";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";

export const financeRouter = Router();

// Apply auth middleware to all finance endpoints
financeRouter.use(requireAuth);

/**
 * GET /api/finance/summary
 * Retrieve aggregated income summary from Notion.
 * Query params: fromDate (YYYY-MM-DD), toDate (YYYY-MM-DD)
 */
financeRouter.get("/summary", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const fromDate = typeof req.query.fromDate === "string" ? req.query.fromDate : undefined;
    const toDate = typeof req.query.toDate === "string" ? req.query.toDate : undefined;

    const summary = await getIncomeSummary({ fromDate, toDate });
    res.json(summary);
  } catch (err) {
    res.status(500).json({
      error: (err as Error).message || "Failed to retrieve income summary",
    });
  }
});

/**
 * POST /api/finance/sync
 * Trigger salary sync from Outlook to Notion.
 * Body: { dryRun?: boolean, force?: boolean, since?: string, count?: number }
 */
financeRouter.post("/sync", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { dryRun, force, since, count } = req.body || {};

    const result = await syncSalaryToNotion({
      dryRun: dryRun === undefined ? false : Boolean(dryRun),
      force: Boolean(force),
      since: typeof since === "string" ? since : undefined,
      count: typeof count === "number" ? count : undefined,
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: (err as Error).message || "Failed to sync salary to Notion",
    });
  }
});
