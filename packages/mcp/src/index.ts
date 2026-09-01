#!/usr/bin/env node
import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import { logger } from "@prabu-life-os/shared";
import { initOutlookConfig } from "@prabu-life-os/core";
import { allTools, handleToolCall } from "./tools";

function createServer(): Server {
  const server = new Server(
    { name: "prabu-life-os-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allTools,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    return handleToolCall(name, args as Record<string, unknown>);
  });

  return server;
}

async function startStdio(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("Prabu Life OS MCP server running in stdio mode");
}

async function startHttp(port: number): Promise<void> {
  const app = express();
  const transports: Map<string, SSEServerTransport> = new Map();

  app.get("/sse", async (req, res) => {
    const transport = new SSEServerTransport("/messages", res);
    const sessionId = transport.sessionId;
    transports.set(sessionId, transport);

    res.on("close", () => transports.delete(sessionId));

    const server = createServer();
    await server.connect(transport);
  });

  app.post("/messages", express.json(), async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports.get(sessionId);
    if (!transport) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    await transport.handlePostMessage(req, res);
  });

  app.get("/health", (_req, res) => res.json({ status: "ok", service: "prabu-life-os-mcp" }));

  app.listen(port, () => {
    logger.info(`Prabu Life OS MCP server running in HTTP mode on port ${port}`);
  });
}

async function main(): Promise<void> {
  try {
    await initOutlookConfig();
  } catch (err) {
    logger.warn(`Could not initialize Outlook config at startup: ${(err as Error).message}`);
  }

  const mode = process.env.MCP_MODE || "stdio";
  const port = parseInt(process.env.PORT || "3000", 10);

  if (mode === "http") {
    await startHttp(port);
  } else {
    await startStdio();
  }
}

main().catch((err: Error) => {
  logger.error(err.message);
  process.exit(1);
});
