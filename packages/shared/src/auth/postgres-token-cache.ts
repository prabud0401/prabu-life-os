import type { ICachePlugin, TokenCacheContext } from "@azure/msal-node";
import { getPool, isDatabaseConfigured } from "../db/pool";

const MSAL_PROVIDER = "msal";

export function createPostgresTokenCache(mcpName: string): ICachePlugin {
  return {
    beforeCacheAccess: async (cacheContext: TokenCacheContext) => {
      if (!isDatabaseConfigured()) {
        return;
      }

      const result = await getPool().query<{ refresh_token: string | null }>(
        `SELECT refresh_token
         FROM oauth_tokens
         WHERE provider = $1 AND user_id = $2`,
        [MSAL_PROVIDER, mcpName]
      );

      const serialized = result.rows[0]?.refresh_token;
      if (serialized) {
        cacheContext.tokenCache.deserialize(serialized);
      }
    },

    afterCacheAccess: async (cacheContext: TokenCacheContext) => {
      if (!cacheContext.cacheHasChanged || !isDatabaseConfigured()) {
        return;
      }

      const serialized = cacheContext.tokenCache.serialize();
      await getPool().query(
        `INSERT INTO oauth_tokens (provider, user_id, refresh_token, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (provider, user_id)
         DO UPDATE SET
           refresh_token = EXCLUDED.refresh_token,
           updated_at = NOW()`,
        [MSAL_PROVIDER, mcpName, serialized]
      );
    },
  };
}
