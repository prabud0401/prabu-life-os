import type { PmToolConfig } from "./types";

export function getPmToolConfig(): PmToolConfig {
  const configured =
    process.env.PM_TOOL_BASE_URL ||
    process.env.PM_TOOL_MCP_URL ||
    "https://pm-tool.blueoceansp.dev/api/mcp/";

  return {
    baseUrl: configured,
    mcpUrl: configured,
    token: process.env.PM_MCP_TOKEN,
  };
}

export function isPmToolConfigured(): boolean {
  const config = getPmToolConfig();
  return Boolean(config.token && config.token.trim());
}
