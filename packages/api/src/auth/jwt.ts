import jwt, { type SignOptions } from "jsonwebtoken";
import { logger } from "@prabu-life-os/shared";

const DEFAULT_EXPIRES_IN = "1h";

export interface JwtPayload {
  sub: string;
  role?: string;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.PRABU_MCP_API_KEY;
  if (!secret) {
    logger.warn(
      "Neither JWT_SECRET nor PRABU_MCP_API_KEY is set. Using default insecure secret for dev."
    );
    return "dev-insecure-jwt-secret-change-me";
  }
  return secret;
}

export function generateToken(
  payload: Record<string, unknown> = {},
  expiresIn: string | number = DEFAULT_EXPIRES_IN
): string {
  const secret = getJwtSecret();
  const basePayload: JwtPayload = {
    sub: "prabu-life-os-user",
    role: "admin",
    ...payload,
  };

  const options: SignOptions = {
    expiresIn: expiresIn as any,
  };

  return jwt.sign(basePayload, secret, options);
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret);
    return decoded as JwtPayload;
  } catch (err) {
    return null;
  }
}
