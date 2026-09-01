export { createFileTokenCache, createTokenCache } from "./auth/token-cache";
export { createPostgresTokenCache } from "./auth/postgres-token-cache";
export {
  runDeviceCodeAuth,
  runAuthCodeFlow,
  getAccessToken,
  isAuthenticated,
  getMicrosoftAuthUrl,
  acquireMicrosoftTokenByCode,
  getOAuthRedirectUri,
} from "./auth/msal-helper";
export type { AuthConfig } from "./auth/msal-helper";
export { getKeyVaultSecret } from "./keyvault/client";
export { logger } from "./utils/logger";
export { runOAuth2Flow, getOAuth2AccessToken, isOAuth2Authenticated } from "./oauth2/client";
export type { OAuth2Config } from "./oauth2/client";
export { createGraphClient } from "./graph/client";
export {
  getDatabaseUrl,
  isDatabaseConfigured,
  getPool,
  pingDatabase,
  closePool,
} from "./db/pool";
export { logSyncJob } from "./db/sync-log";
export {
  upsertMsalTokenCache,
  upsertOAuth2Token,
  getOAuth2Token,
  hasOAuthToken,
} from "./db/oauth-tokens";
