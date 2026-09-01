import { Router, type Request, type Response } from "express";
import { generateToken } from "../auth/jwt";

export const authRouter = Router();

/**
 * POST /api/auth/token
 * Exchange PRABU_MCP_API_KEY for a short-lived JWT.
 */
authRouter.post("/token", (req: Request, res: Response) => {
  const configuredApiKey = process.env.PRABU_MCP_API_KEY;
  if (!configuredApiKey) {
    res.status(500).json({
      error: "PRABU_MCP_API_KEY is not configured on the server",
    });
    return;
  }

  const bodyKey = req.body?.apiKey;
  const headerKey = req.headers["x-api-key"];
  const bearerKey = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7).trim()
    : undefined;

  const providedKey = bodyKey || headerKey || bearerKey;

  if (!providedKey || providedKey !== configuredApiKey) {
    res.status(401).json({
      error: "Invalid or missing API key. Provide apiKey in request body or Authorization header.",
    });
    return;
  }

  const expiresInSeconds = 3600; // 1 hour
  const token = generateToken(
    { sub: "prabu-life-os-user", role: "admin" },
    expiresInSeconds
  );

  res.json({
    token,
    tokenType: "Bearer",
    expiresIn: expiresInSeconds,
    user: {
      sub: "prabu-life-os-user",
      role: "admin",
    },
  });
});
