#!/usr/bin/env node
import "dotenv/config";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { logger } from "@prabu-life-os/shared";
import { initOutlookConfig, initTeamsConfig } from "@prabu-life-os/core";
import { startHttpServer } from "./http-server";
import { createStdioServer } from "./stdio-server";

async function main(): Promise<void> {
  try {
    await initOutlookConfig();
  } catch (err) {
    logger.warn(
      `Could not initialize Outlook config at startup: ${(err as Error).message}`
    );
  }

  try {
    await initTeamsConfig();
  } catch (err) {
    logger.warn(
      `Could not initialize Teams config at startup: ${(err as Error).message}`
    );
  }

  const mode = process.env.MCP_MODE || "stdio";
  const port = parseInt(process.env.PORT || "3000", 10);

  if (mode === "http") {
    await startHttpServer(port);
  } else {
    const server = createStdioServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info("Prabu Life OS MCP server running in stdio mode");
  }
}

main().catch((err: Error) => {
  logger.error(err.message);
  process.exit(1);
});
