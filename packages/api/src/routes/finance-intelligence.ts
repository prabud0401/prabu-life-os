import { Router, type Response } from "express";
import {
  classifyTransaction,
  ingestEmailNotification,
  ingestSmsAlert,
  listTransactions,
  REGISTERED_ACCOUNTS,
  runFinancialReconciliation,
  syncFinanceEmailsFromGmail,
} from "@prabu-life-os/core";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";

export const financeIntelligenceRouter = Router();
financeIntelligenceRouter.use(requireAuth);

/**
 * GET /api/finance/intelligence/report
 */
financeIntelligenceRouter.get("/report", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const fromDate = typeof req.query.fromDate === "string" ? req.query.fromDate : undefined;
    const toDate = typeof req.query.toDate === "string" ? req.query.toDate : undefined;
    const report = await runFinancialReconciliation({ fromDate, toDate });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/finance/intelligence/ingest/sms
 * Tasker / MacroDroid webhook target
 */
financeIntelligenceRouter.post("/ingest/sms", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sender, text, receivedAt } = req.body || {};
    if (!sender || !text) {
      res.status(400).json({ error: "sender and text are required" });
      return;
    }
    const result = await ingestSmsAlert({ sender, text, receivedAt });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/finance/intelligence/ingest/email
 */
financeIntelligenceRouter.post("/ingest/email", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { from, subject, body, receivedAt, messageId } = req.body || {};
    const result = await ingestEmailNotification({
      from,
      subject,
      body,
      receivedAt,
      messageId,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/finance/intelligence/classify
 */
financeIntelligenceRouter.post("/classify", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { description, subject, from, amountLkr, direction, accountId, counterparty } =
      req.body || {};
    if (!description || amountLkr == null || !direction) {
      res.status(400).json({ error: "description, amountLkr, and direction are required" });
      return;
    }
    const tx = classifyTransaction({
      description,
      subject,
      from,
      amountLkr: Number(amountLkr),
      direction,
      accountId,
      counterparty,
    });
    res.json(tx);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/finance/intelligence/accounts
 */
financeIntelligenceRouter.get("/accounts", (_req, res: Response) => {
  res.json({ accounts: REGISTERED_ACCOUNTS });
});

/**
 * GET /api/finance/intelligence/transactions
 */
financeIntelligenceRouter.get("/transactions", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const fromDate = typeof req.query.fromDate === "string" ? req.query.fromDate : undefined;
    const toDate = typeof req.query.toDate === "string" ? req.query.toDate : undefined;
    const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : 100;
    const transactions = await listTransactions({ fromDate, toDate, limit });
    res.json({ count: transactions.length, transactions });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/finance/intelligence/sync/gmail
 * Pull bill/card/transfer emails from Gmail into the ledger
 */
financeIntelligenceRouter.post("/sync/gmail", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { maxPerQuery, since } = req.body || {};
    const result = await syncFinanceEmailsFromGmail({
      maxPerQuery: typeof maxPerQuery === "number" ? maxPerQuery : undefined,
      since: typeof since === "string" ? since : undefined,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
