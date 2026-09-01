import { getPool, isDatabaseConfigured } from "./pool";

const MSAL_PROVIDER = "msal";

export async function upsertMsalTokenCache(
  mcpName: string,
  serialized: string
): Promise<void> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not set");
  }

  if (!serialized?.trim()) {
    throw new Error("MSAL cache payload is empty");
  }

  await getPool().query(
    `INSERT INTO oauth_tokens (provider, user_id, refresh_token, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (provider, user_id)
     DO UPDATE SET
       refresh_token = EXCLUDED.refresh_token,
       updated_at = NOW()`,
    [MSAL_PROVIDER, mcpName, serialized]
  );
}

export async function upsertOAuth2Token(
  provider: string,
  userId: string,
  tokenData: string | Record<string, unknown>
): Promise<void> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not set");
  }

  const rawJson = typeof tokenData === "string" ? tokenData : JSON.stringify(tokenData);
  if (!rawJson?.trim()) {
    throw new Error("OAuth token payload is empty");
  }

  let parsed: Record<string, unknown> = {};
  try {
    parsed = typeof tokenData === "object" ? tokenData : JSON.parse(rawJson);
  } catch {
    // If not JSON, use as raw token
  }

  const accessToken = typeof parsed.access_token === "string" ? parsed.access_token : null;
  const refreshToken = rawJson; // store full JSON representation
  const scope = typeof parsed.scope === "string" ? parsed.scope : null;
  let expiresAt: Date | null = null;
  if (typeof parsed.expiry_date === "number") {
    expiresAt = new Date(parsed.expiry_date);
  } else if (typeof parsed.expires_at === "string" || typeof parsed.expires_at === "number") {
    expiresAt = new Date(parsed.expires_at);
  }

  await getPool().query(
    `INSERT INTO oauth_tokens (provider, user_id, access_token, refresh_token, scope, expires_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (provider, user_id)
     DO UPDATE SET
       access_token = EXCLUDED.access_token,
       refresh_token = EXCLUDED.refresh_token,
       scope = EXCLUDED.scope,
       expires_at = EXCLUDED.expires_at,
       updated_at = NOW()`,
    [provider, userId, accessToken, refreshToken, scope, expiresAt]
  );
}

export async function getOAuth2Token<T = Record<string, unknown>>(
  provider: string,
  userId: string
): Promise<T | null> {
  if (!isDatabaseConfigured()) {
    return null;
  }

  const res = await getPool().query(
    `SELECT provider, user_id, access_token, refresh_token, scope, expires_at, updated_at
     FROM oauth_tokens
     WHERE provider = $1 AND user_id = $2`,
    [provider, userId]
  );

  if (res.rows.length === 0) {
    return null;
  }

  const row = res.rows[0];
  if (!row.refresh_token) {
    return null;
  }

  try {
    return JSON.parse(row.refresh_token) as T;
  } catch {
    return {
      access_token: row.access_token,
      refresh_token: row.refresh_token,
      scope: row.scope,
      expires_at: row.expires_at,
    } as unknown as T;
  }
}

export async function hasOAuthToken(
  provider: string,
  userId: string
): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    return false;
  }

  try {
    const res = await getPool().query(
      `SELECT 1 FROM oauth_tokens WHERE provider = $1 AND user_id = $2 LIMIT 1`,
      [provider, userId]
    );
    return res.rows.length > 0;
  } catch {
    return false;
  }
}
