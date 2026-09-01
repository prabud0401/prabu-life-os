import { Router } from "express";
import { authRouter } from "./routes/auth";
import { healthRouter } from "./routes/health";
import { financeRouter } from "./routes/finance";
import { transactionsRouter } from "./routes/transactions";

export function createApiRouter(): Router {
  const router = Router();

  router.use("/auth", authRouter);
  router.use("/health", healthRouter);
  router.use("/finance", financeRouter);
  router.use("/transactions", transactionsRouter);

  return router;
}
