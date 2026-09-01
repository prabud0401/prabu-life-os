import { google, type Auth } from "googleapis";
import {
  getGmailCredentials,
  saveGmailCredentials,
} from "./auth";
import { loadGmailOAuthKeys } from "./config";
import type { GmailCredentials } from "./types";

const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

function createOAuth2Client(): Auth.OAuth2Client {
  const keys = loadGmailOAuthKeys();
  return new google.auth.OAuth2(
    keys.client_id,
    keys.client_secret,
    keys.redirect_uris[0]
  );
}

async function refreshAccessToken(
  oauth2Client: Auth.OAuth2Client,
  credentials: GmailCredentials
): Promise<GmailCredentials> {
  oauth2Client.setCredentials({ refresh_token: credentials.refresh_token });
  const { credentials: newCreds } = await oauth2Client.refreshAccessToken();

  const updated: GmailCredentials = {
    ...credentials,
    access_token: newCreds.access_token!,
    refresh_token: credentials.refresh_token,
    expiry_date: newCreds.expiry_date!,
  };

  await saveGmailCredentials(updated);
  return updated;
}

export async function getAuthenticatedGmailClient(): Promise<Auth.OAuth2Client> {
  const oauth2Client = createOAuth2Client();
  const credentials = await getGmailCredentials();

  if (!credentials?.refresh_token) {
    throw new Error(
      "Gmail not authenticated. Run local gmail-mcp auth, then npm run auth:gmail:bridge."
    );
  }

  const now = Date.now();
  const expiry = credentials.expiry_date ?? 0;
  let validCredentials = credentials;

  if (!credentials.access_token || expiry < now + EXPIRY_BUFFER_MS) {
    validCredentials = await refreshAccessToken(oauth2Client, credentials);
  }

  oauth2Client.setCredentials({
    access_token: validCredentials.access_token,
    refresh_token: validCredentials.refresh_token,
    expiry_date: validCredentials.expiry_date,
  });

  return oauth2Client;
}

export async function getGmailClient() {
  const auth = await getAuthenticatedGmailClient();
  return google.gmail({ version: "v1", auth });
}
