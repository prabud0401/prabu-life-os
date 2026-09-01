import crypto from "crypto";
import { getDefaultOAuthClient } from "./config";

export interface OAuthClientRecord {
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
  clientName?: string;
}

export interface AuthCodeRecord {
  code: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  resource?: string;
  scope: string;
  expiresAt: number;
}

const authCodes = new Map<string, AuthCodeRecord>();
const dynamicClients = new Map<string, OAuthClientRecord>();

function purgeExpiredCodes(): void {
  const now = Date.now();
  for (const [code, record] of authCodes.entries()) {
    if (record.expiresAt <= now) authCodes.delete(code);
  }
}

export function getOAuthClient(clientId: string): OAuthClientRecord | null {
  const defaults = getDefaultOAuthClient();
  if (clientId === defaults.clientId) {
    return {
      clientId: defaults.clientId,
      clientSecret: defaults.clientSecret,
      redirectUris: ["*"],
      clientName: "Prabu Life OS (default)",
    };
  }
  return dynamicClients.get(clientId) ?? null;
}

export function registerDynamicClient(input: {
  redirect_uris?: string[];
  client_name?: string;
}): OAuthClientRecord {
  const clientId = `mcp_${crypto.randomBytes(16).toString("hex")}`;
  const clientSecret = crypto.randomBytes(32).toString("hex");
  const record: OAuthClientRecord = {
    clientId,
    clientSecret,
    redirectUris: input.redirect_uris ?? [],
    clientName: input.client_name,
  };
  dynamicClients.set(clientId, record);
  return record;
}

export function isRedirectUriAllowed(client: OAuthClientRecord, redirectUri: string): boolean {
  if (client.redirectUris.includes("*")) return true;
  if (client.redirectUris.includes(redirectUri)) return true;
  return client.redirectUris.some((allowed) => {
    if (allowed.endsWith("*")) {
      return redirectUri.startsWith(allowed.slice(0, -1));
    }
    return false;
  });
}

export function createAuthCode(record: Omit<AuthCodeRecord, "code" | "expiresAt">): string {
  purgeExpiredCodes();
  const code = crypto.randomBytes(24).toString("hex");
  authCodes.set(code, {
    ...record,
    code,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
  return code;
}

export function consumeAuthCode(code: string): AuthCodeRecord | null {
  purgeExpiredCodes();
  const record = authCodes.get(code);
  if (!record) return null;
  authCodes.delete(code);
  if (record.expiresAt <= Date.now()) return null;
  return record;
}

export function verifyPkce(
  codeChallenge: string,
  codeChallengeMethod: string,
  codeVerifier: string
): boolean {
  if (codeChallengeMethod !== "S256") return false;
  const digest = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  return digest === codeChallenge;
}
