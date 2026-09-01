import fs from "fs";
import path from "path";
import {
  getOAuth2Token,
  isDatabaseConfigured,
  upsertOAuth2Token,
} from "@prabu-life-os/shared";
import { getGmailCredentialsPath } from "./config";
import type { GmailCredentials } from "./types";

export const GMAIL_PROVIDER = "oauth2";
export const GMAIL_USER_ID = "gmail";

/**
 * Retrieve Gmail credentials from Postgres (cloud) or local file (disk).
 */
export async function getGmailCredentials(): Promise<GmailCredentials | null> {
  // 1. Check Postgres if configured
  if (isDatabaseConfigured()) {
    try {
      const dbCreds = await getOAuth2Token<GmailCredentials>(
        GMAIL_PROVIDER,
        GMAIL_USER_ID
      );
      if (dbCreds && (dbCreds.refresh_token || dbCreds.access_token)) {
        return dbCreds;
      }
    } catch {
      // Fallback to disk if DB query fails
    }
  }

  // 2. Check local disk credentials file
  const credPath = getGmailCredentialsPath();
  if (fs.existsSync(credPath)) {
    try {
      const content = fs.readFileSync(credPath, "utf-8");
      return JSON.parse(content) as GmailCredentials;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Check if Gmail authentication is available (either in Postgres or local disk).
 */
export async function isGmailAuthenticated(): Promise<boolean> {
  const creds = await getGmailCredentials();
  return Boolean(creds && (creds.refresh_token || creds.access_token));
}

export async function saveGmailCredentials(credentials: GmailCredentials): Promise<void> {
  if (isDatabaseConfigured()) {
    await upsertOAuth2Token(GMAIL_PROVIDER, GMAIL_USER_ID, credentials);
    return;
  }

  const credPath = getGmailCredentialsPath();
  const dir = path.dirname(credPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(credPath, JSON.stringify(credentials, null, 2));
}
