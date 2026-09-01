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
