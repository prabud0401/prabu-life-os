import { Router, type Response } from "express";
import { queryTransactionsFromNotion } from "@prabu-life-os/core";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";

export const transactionsRouter = Router();

// Apply auth middleware
transactionsRouter.use(requireAuth);

/**
 * GET /api/transactions
 * List transactions from Notion Transactions DB.
 * Query params (optional): limit (number), type (Income|Expense), category (Salary|Bonus|...)
 */
transactionsRouter.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawTransactions = await queryTransactionsFromNotion();

    let transactions = rawTransactions;

    const typeFilter = typeof req.query.type === "string" ? req.query.type.toLowerCase() : undefined;
    if (typeFilter) {
      transactions = transactions.filter(
        (t) => t.type && t.type.toLowerCase() === typeFilter
      );
    }

    const categoryFilter =
      typeof req.query.category === "string" ? req.query.category.toLowerCase() : undefined;
    if (categoryFilter) {
      transactions = transactions.filter(
        (t) => t.category && t.category.toLowerCase() === categoryFilter
      );
    }

    const total = transactions.length;

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    if (limit && !isNaN(limit) && limit > 0) {
      transactions = transactions.slice(0, limit);
    }

    res.json({
      total,
      count: transactions.length,
      transactions,
    });
  } catch (err) {
    res.status(500).json({
      error: (err as Error).message || "Failed to query transactions from Notion",
    });
  }
});
