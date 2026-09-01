import path from "path";
import os from "os";

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
