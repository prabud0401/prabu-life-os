import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "../auth/jwt";

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const apiKey = process.env.PRABU_MCP_API_KEY;
  const jwtSecret = process.env.JWT_SECRET;

  // If no security keys are set at all, allow for local dev
  if (!apiKey && !jwtSecret) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  const xApiKey = typeof req.headers["x-api-key"] === "string" ? req.headers["x-api-key"] : undefined;
  const queryKey = typeof req.query.api_key === "string" ? req.query.api_key : undefined;

  let bearerToken: string | undefined;
  if (authHeader?.startsWith("Bearer ")) {
    bearerToken = authHeader.slice(7).trim();
  }

  // 1. Check direct API key match
  if (apiKey && (bearerToken === apiKey || xApiKey === apiKey || queryKey === apiKey)) {
    req.user = { sub: "api-key-user", role: "admin" };
    next();
    return;
  }

  // 2. Check JWT Bearer token
  if (bearerToken) {
    const payload = verifyToken(bearerToken);
    if (payload) {
      req.user = payload;
      next();
      return;
    }
  }

  res.status(401).json({
    error: "Unauthorized — provide a valid Bearer JWT or API Key in Authorization header",
  });
}
