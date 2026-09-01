import type { PmToolConfig } from "./types";

export function getPmToolConfig(): PmToolConfig {
  return {
    baseUrl: process.env.PM_TOOL_BASE_URL || "https://pm.blueoceansp.ai/api",
    token: process.env.PM_MCP_TOKEN,
  };
}

export function isPmToolConfigured(): boolean {
  const config = getPmToolConfig();
  return Boolean(config.token && config.token.trim());
}
