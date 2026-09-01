import { Router } from "express";
import { authRouter } from "./routes/auth";
import { healthRouter } from "./routes/health";
import { financeRouter } from "./routes/finance";
import { financeIntelligenceRouter } from "./routes/finance-intelligence";
import { transactionsRouter } from "./routes/transactions";
import { pmRouter } from "./routes/pm";

export function createApiRouter(): Router {
  const router = Router();

  router.use("/auth", authRouter);
  router.use("/health", healthRouter);
  router.use("/finance", financeRouter);
  router.use("/finance/intelligence", financeIntelligenceRouter);
  router.use("/transactions", transactionsRouter);
  router.use("/pm", pmRouter);

  return router;
}
