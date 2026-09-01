import express, { type Express } from "express";
import dotenv from "dotenv";
import { logger } from "@prabu-life-os/shared";
import { createApiRouter } from "./router";

dotenv.config();

export function createApp(): Express {
  const app = express();
  app.use(express.json());

  // Mount main API router
  app.use("/api", createApiRouter());

  // Root health check fallback
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "prabu-life-os-api" });
  });

  return app;
}

export function startApiServer(port?: number): void {
  const app = createApp();
  const serverPort = port || parseInt(process.env.API_PORT || process.env.PORT || "3001", 10);

  app.listen(serverPort, () => {
    logger.info(`Prabu Life OS REST API server running on port ${serverPort}`);
  });
}

// Start automatically if run directly
if (require.main === module) {
  startApiServer();
}
