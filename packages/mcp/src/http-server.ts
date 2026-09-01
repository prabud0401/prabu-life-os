import express, { type Express } from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { logger, pingDatabase } from "@prabu-life-os/shared";
import { allTools, handleToolCall } from "./tools";
import { requireApiKey } from "./middleware/api-key";
import { registerAuthRoutes } from "./routes/auth";

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

export async function startHttpServer(port: number): Promise<void> {
  const app: Express = express();
  const transports = new Map<string, SSEServerTransport>();

  app.get("/health", async (_req, res) => {
    const database = await pingDatabase().catch(() => false);
    res.json({
      status: "ok",
      service: "prabu-life-os-mcp",
      mode: "http",
      database,
    });
  });

  registerAuthRoutes(app);

  app.get("/sse", requireApiKey, async (req, res) => {
    const transport = new SSEServerTransport("/messages", res);
    const sessionId = transport.sessionId;
    transports.set(sessionId, transport);

    res.on("close", () => transports.delete(sessionId));

    const server = createServer();
    await server.connect(transport);
    logger.info(`MCP SSE session started: ${sessionId}`);
  });

  app.post("/messages", requireApiKey, express.json(), async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports.get(sessionId);
    if (!transport) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    await transport.handlePostMessage(req, res);
  });

  app.listen(port, () => {
    logger.info(`Prabu Life OS MCP server running in HTTP mode on port ${port}`);
  });
}
