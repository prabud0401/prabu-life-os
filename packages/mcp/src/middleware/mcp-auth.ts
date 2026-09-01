import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "@prabu-life-os/api";
import { getPublicBaseUrl, getMcpResourceUrl } from "../oauth/config";

export function sendMcpUnauthorized(res: Response): void {
  const resourceMetadataUrl = `${getPublicBaseUrl()}/.well-known/oauth-protected-resource/mcp`;
  res.setHeader(
    "WWW-Authenticate",
    `Bearer realm="mcp", resource_metadata="${resourceMetadataUrl}"`
  );
  res.status(401).json({
    error: "invalid_token",
    error_description:
      "Authentication required. Use OAuth (Gemini) or Authorization: Bearer <PRABU_MCP_API_KEY>.",
  });
}

export function requireMcpAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const apiKey = process.env.PRABU_MCP_API_KEY;
  const header = req.headers.authorization;
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const queryKey = typeof req.query.api_key === "string" ? req.query.api_key : undefined;

  if (apiKey && (bearer === apiKey || queryKey === apiKey)) {
    next();
    return;
  }

  if (bearer) {
    const payload = verifyToken(bearer);
    const resource = getMcpResourceUrl();
    if (payload && (payload.aud === resource || !payload.aud)) {
      next();
      return;
    }
  }

  sendMcpUnauthorized(res);
}
