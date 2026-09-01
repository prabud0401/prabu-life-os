import "dotenv/config";
import { getKeyVaultSecret } from "@prabu-life-os/shared";
import type { AuthConfig } from "@prabu-life-os/shared";

const KV_URL =
  process.env.AZURE_KEYVAULT_URL ?? "https://kv-bluocn-cstmr-prod.vault.azure.net/";

// Secret names in Key Vault
const KV_CLIENT_ID = "scrt-bluocn-app-reg-blueocean-internal-user-mailbox-client-id";
const KV_TENANT_ID = "scrt-blueocean-tenant-id";

let _authConfig: AuthConfig | null = null;

export async function initOutlookConfig(): Promise<void> {
  let clientId = process.env.OUTLOOK_CLIENT_ID;
  let tenantId = process.env.OUTLOOK_TENANT_ID;

  if (!clientId || !tenantId) {
    const [kvClientId, kvTenantId] = await Promise.all([
      getKeyVaultSecret(KV_URL, KV_CLIENT_ID),
      getKeyVaultSecret(KV_URL, KV_TENANT_ID),
    ]);
    clientId = clientId ?? kvClientId;
    tenantId = tenantId ?? kvTenantId;
  }

  _authConfig = {
    clientId,
    tenantId,
    clientSecret: process.env.OUTLOOK_CLIENT_SECRET,
    scopes: [
      "https://graph.microsoft.com/Mail.Read",
      "https://graph.microsoft.com/User.Read",
    ],
    mcpName: "outlook",
  };
}

export function getOutlookAuthConfig(): AuthConfig {
  if (!_authConfig) {
    throw new Error("Outlook config not initialized — call initOutlookConfig() first");
  }
  return _authConfig;
}
