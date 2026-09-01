import { getPmToolConfig } from "./config";
import { logger } from "@prabu-life-os/shared";

interface McpTextContent {
  type: string;
  text?: string;
}

interface McpToolResult {
  content?: McpTextContent[];
  isError?: boolean;
}

function getMcpUrl(): string {
  const config = getPmToolConfig();
  const raw = config.mcpUrl || config.baseUrl;
  let url = raw;
  if (!url.endsWith("/mcp") && !url.endsWith("/mcp/")) {
    if (url.endsWith("/api")) {
      url = `${url}/mcp`;
    } else {
      url = `${url.replace(/\/$/, "")}/api/mcp`;
    }
  }
  return url.endsWith("/") ? url : `${url}/`;
}

function parseMcpJson(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Empty MCP response");
  }

  const parsed = JSON.parse(trimmed) as unknown;
  if (Array.isArray(parsed)) {
    for (let i = parsed.length - 1; i >= 0; i--) {
      const entry = parsed[i] as { result?: unknown; error?: { message?: string } };
      if (entry?.error) {
        throw new Error(entry.error.message || JSON.stringify(entry.error));
      }
      if (entry?.result !== undefined) {
        return entry.result;
      }
    }
    throw new Error("MCP batch response contained no results");
  }

  if (typeof parsed === "object" && parsed !== null) {
    const entry = parsed as { result?: unknown; error?: { message?: string } };
    if (entry.error) {
      throw new Error(entry.error.message || JSON.stringify(entry.error));
    }
    if (entry.result !== undefined) {
      return entry.result;
    }
    return parsed;
  }

  for (const line of trimmed.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    const event = JSON.parse(payload) as { result?: unknown; error?: { message?: string } };
    if (event.error) {
      throw new Error(event.error.message || JSON.stringify(event.error));
    }
    if (event.result !== undefined) {
      return event.result;
    }
  }

  throw new Error(`Unparseable MCP response: ${trimmed.slice(0, 200)}`);
}

async function postMcp(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
  const config = getPmToolConfig();
  if (!config.token) {
    throw new Error(
      "PM_MCP_TOKEN is not configured. Please set PM_MCP_TOKEN in your environment or .env file."
    );
  }

  const url = getMcpUrl();
  const requestId = Date.now();
  const messages =
    method === "tools/call"
      ? [
          {
            jsonrpc: "2.0",
            id: requestId,
            method: "initialize",
            params: {
              protocolVersion: "2024-11-05",
              capabilities: {},
              clientInfo: { name: "prabu-life-os", version: "0.1.0" },
            },
          },
          {
            jsonrpc: "2.0",
            id: requestId + 1,
            method,
            params,
          },
        ]
      : [
          {
            jsonrpc: "2.0",
            id: requestId,
            method,
            params,
          },
        ];

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify(messages),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`PM Tool MCP request failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const envelope = parseMcpJson(text) as { content?: McpTextContent[]; isError?: boolean } | McpToolResult;
  if ("content" in envelope && Array.isArray(envelope.content)) {
    if (envelope.isError) {
      const message = envelope.content
        .filter((part) => part.type === "text" && part.text)
        .map((part) => part.text)
        .join("\n");
      throw new Error(message || "PM Tool MCP tool call failed");
    }
    const textPart = envelope.content.find((part) => part.type === "text" && part.text);
    if (!textPart?.text) {
      return envelope;
    }
    try {
      return JSON.parse(textPart.text);
    } catch {
      return textPart.text;
    }
  }

  return envelope;
}

export async function callPmMcpTool<T = unknown>(
  toolName: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  try {
    const result = await postMcp("tools/call", {
      name: toolName,
      arguments: args,
    });
    return result as T;
  } catch (err) {
    logger.error(`PM Tool MCP ${toolName} failed: ${(err as Error).message}`);
    throw err;
  }
}
