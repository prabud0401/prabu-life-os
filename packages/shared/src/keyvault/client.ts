import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";

let _kvClient: SecretClient | null = null;

function getClient(vaultUrl: string): SecretClient {
  if (!_kvClient) {
    _kvClient = new SecretClient(vaultUrl, new DefaultAzureCredential());
  }
  return _kvClient;
}

export async function getKeyVaultSecret(vaultUrl: string, secretName: string): Promise<string> {
  const client = getClient(vaultUrl);
  const secret = await client.getSecret(secretName);
  if (!secret.value) {
    throw new Error(`Key Vault secret '${secretName}' exists but has no value`);
  }
  return secret.value;
}
