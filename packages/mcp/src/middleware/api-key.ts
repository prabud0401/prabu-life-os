import type { Request, Response, NextFunction } from "express";

export function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const apiKey = process.env.PRABU_MCP_API_KEY;
  if (!apiKey) {
    next();
    return;
  }

  const header = req.headers.authorization;
  const queryKey = typeof req.query.api_key === "string" ? req.query.api_key : undefined;
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (bearer === apiKey || queryKey === apiKey) {
    next();
    return;
  }

  res.status(401).json({ error: "Unauthorized — set Authorization: Bearer <PRABU_MCP_API_KEY>" });
}
