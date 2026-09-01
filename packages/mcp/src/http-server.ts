import express, { type Express } from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
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

  // Streamable HTTP (Grok, modern MCP clients) — POST/GET /sse
  app.all("/sse", requireApiKey, express.json(), async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    const server = createServer();
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  // Legacy SSE transport (session-based clients using GET /sse + POST /messages)
  const legacyTransports = new Map<string, SSEServerTransport>();

  app.get("/sse/legacy", requireApiKey, async (_req, res) => {
    const transport = new SSEServerTransport("/messages", res);
    const sessionId = transport.sessionId;
    legacyTransports.set(sessionId, transport);

    res.on("close", () => legacyTransports.delete(sessionId));

    const server = createServer();
    await server.connect(transport);
    logger.info(`MCP legacy SSE session started: ${sessionId}`);
  });

  app.post("/messages", requireApiKey, express.json(), async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport = legacyTransports.get(sessionId);
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
