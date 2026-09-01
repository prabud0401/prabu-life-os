export const MCP_SCOPE = "mcp:tools";

export function getPublicBaseUrl(): string {
  const raw =
    process.env.MCP_PUBLIC_URL ||
    process.env.RAILWAY_APP_URL ||
    `http://localhost:${process.env.PORT || "3000"}`;
  return raw.replace(/\/$/, "");
}

export function getMcpResourceUrl(): string {
  return `${getPublicBaseUrl()}/mcp`;
}

export function getIssuer(): string {
  return getPublicBaseUrl();
}

export function getDefaultOAuthClient(): { clientId: string; clientSecret: string } {
  const clientId = process.env.MCP_OAUTH_CLIENT_ID || "prabu-life-os-gemini";
  const clientSecret =
    process.env.MCP_OAUTH_CLIENT_SECRET ||
    process.env.JWT_SECRET ||
    process.env.PRABU_MCP_API_KEY ||
    "change-me-in-production";
  return { clientId, clientSecret };
}
