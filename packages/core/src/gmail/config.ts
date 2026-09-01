import fs from "fs";
import path from "path";
import os from "os";
import type { GmailOAuthKeys } from "./types";

export function getGmailCredentialsPath(): string {
  if (process.env.GMAIL_CREDENTIALS_PATH) {
    const p = process.env.GMAIL_CREDENTIALS_PATH;
    return p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : path.resolve(p);
  }
  return path.join(os.homedir(), ".gmail-mcp", "credentials.json");
}

export function getGmailOAuthKeysPath(): string {
  if (process.env.GMAIL_OAUTH_KEYS_PATH) {
    const p = process.env.GMAIL_OAUTH_KEYS_PATH;
    return p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : path.resolve(p);
  }
  return path.join(os.homedir(), ".gmail-mcp", "gcp-oauth.keys.json");
}

function parseOAuthKeysFile(content: string): GmailOAuthKeys {
  const parsed = JSON.parse(content) as Record<string, unknown>;
  const keys = (parsed.web || parsed.installed) as
    | { client_id: string; client_secret: string; redirect_uris?: string[] }
    | undefined;

  if (!keys?.client_id || !keys?.client_secret) {
    throw new Error(
      "Invalid OAuth keys format. Expected 'web' or 'installed' credentials."
    );
  }

  return {
    client_id: keys.client_id,
    client_secret: keys.client_secret,
    redirect_uris: keys.redirect_uris || ["http://localhost:3000/oauth2callback"],
  };
}

export function loadGmailOAuthKeys(): GmailOAuthKeys {
  if (process.env.GMAIL_OAUTH_KEYS_B64) {
    const decoded = Buffer.from(process.env.GMAIL_OAUTH_KEYS_B64, "base64").toString("utf-8");
    return parseOAuthKeysFile(decoded);
  }

  if (process.env.GMAIL_OAUTH_KEYS_JSON) {
    return parseOAuthKeysFile(process.env.GMAIL_OAUTH_KEYS_JSON);
  }

  const keysPath = getGmailOAuthKeysPath();
  if (!fs.existsSync(keysPath)) {
    throw new Error(
      `Gmail OAuth keys not found. Set GMAIL_OAUTH_KEYS_PATH or GMAIL_OAUTH_KEYS_JSON.`
    );
  }

  return parseOAuthKeysFile(fs.readFileSync(keysPath, "utf-8"));
}
