import http from "http";
import {
  PublicClientApplication,
  ConfidentialClientApplication,
  type DeviceCodeRequest,
  type SilentFlowRequest,
  type AuthorizationUrlRequest,
  type AuthorizationCodeRequest,
} from "@azure/msal-node";
import { createTokenCache } from "./token-cache";

export interface AuthConfig {
  clientId: string;
  tenantId: string;
  clientSecret?: string; // present → confidential client, absent → public client
  scopes: string[];
  mcpName: string;
}

const AUTH_CALLBACK_PORT = parseInt(process.env.OAUTH_CALLBACK_PORT || "3001", 10);

export function getOAuthRedirectUri(): string {
  return (
    process.env.OAUTH_REDIRECT_URI ||
    `http://localhost:${AUTH_CALLBACK_PORT}/callback`
  );
}

function createPublicApp(config: AuthConfig): PublicClientApplication {
  return new PublicClientApplication({
    auth: {
      clientId: config.clientId,
      authority: `https://login.microsoftonline.com/${config.tenantId}`,
    },
    cache: { cachePlugin: createTokenCache(config.mcpName) },
  });
}

function createConfidentialApp(config: AuthConfig): ConfidentialClientApplication {
  return new ConfidentialClientApplication({
    auth: {
      clientId: config.clientId,
      authority: `https://login.microsoftonline.com/${config.tenantId}`,
      clientSecret: config.clientSecret!,
    },
    cache: { cachePlugin: createTokenCache(config.mcpName) },
  });
}

// For public clients (no client secret) — device code flow
export async function runDeviceCodeAuth(config: AuthConfig): Promise<void> {
  const pca = createPublicApp(config);
  const request: DeviceCodeRequest = {
    deviceCodeCallback: (res) => process.stderr.write(`\n${res.message}\n\n`),
    scopes: config.scopes,
  };
  await pca.acquireTokenByDeviceCode(request);
  process.stderr.write("Authentication successful. Token saved.\n");
}

// For confidential clients (with client secret) — auth code flow via localhost
export async function runAuthCodeFlow(config: AuthConfig): Promise<void> {
  const cca = createConfidentialApp(config);

  const redirectUri = getOAuthRedirectUri();
  const authUrl = await cca.getAuthCodeUrl({
    scopes: config.scopes,
    redirectUri,
  } as AuthorizationUrlRequest);

  process.stderr.write(
    `\nOpen this URL in your browser to sign in:\n\n  ${authUrl}\n\nWaiting for sign-in...\n`
  );

  await new Promise<void>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url!, `http://localhost:${AUTH_CALLBACK_PORT}`);
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");

        if (error) {
          const desc = url.searchParams.get("error_description") ?? error;
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(`<html><body><h2>Authentication failed</h2><p>${desc}</p></body></html>`);
          server.close(() => reject(new Error(desc)));
          return;
        }

        if (code) {
          await cca.acquireTokenByCode({
            code,
            redirectUri: getOAuthRedirectUri(),
            scopes: config.scopes,
          } as AuthorizationCodeRequest);
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(
            "<html><body><h2>Signed in successfully!</h2><p>You can close this tab and return to the terminal.</p></body></html>"
          );
          server.close(() => resolve());
        }
      } catch (err) {
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end(`<html><body><h2>Error</h2><p>${(err as Error).message}</p></body></html>`);
        server.close(() => reject(err));
      }
    });

    server.on("error", reject);
    server.listen(AUTH_CALLBACK_PORT);
  });

  process.stderr.write("Token saved.\n");
}

export async function getAccessToken(config: AuthConfig): Promise<string | null> {
  const app = config.clientSecret ? createConfidentialApp(config) : createPublicApp(config);
  const accounts = await app.getTokenCache().getAllAccounts();

  if (accounts.length === 0) return null;

  try {
    const result = await app.acquireTokenSilent({
      account: accounts[0],
      scopes: config.scopes,
    } as SilentFlowRequest);
    return result?.accessToken ?? null;
  } catch {
    return null;
  }
}

export async function isAuthenticated(config: AuthConfig): Promise<boolean> {
  return (await getAccessToken(config)) !== null;
}

export async function getMicrosoftAuthUrl(config: AuthConfig): Promise<string> {
  if (!config.clientSecret) {
    throw new Error(
      "OUTLOOK_CLIENT_SECRET is required for web OAuth on Railway"
    );
  }

  const cca = createConfidentialApp(config);
  return cca.getAuthCodeUrl({
    scopes: config.scopes,
    redirectUri: getOAuthRedirectUri(),
  } as AuthorizationUrlRequest);
}

export async function acquireMicrosoftTokenByCode(
  config: AuthConfig,
  code: string
): Promise<void> {
  if (!config.clientSecret) {
    throw new Error(
      "OUTLOOK_CLIENT_SECRET is required for web OAuth on Railway"
    );
  }

  const cca = createConfidentialApp(config);
  await cca.acquireTokenByCode({
    code,
    redirectUri: getOAuthRedirectUri(),
    scopes: config.scopes,
  } as AuthorizationCodeRequest);
}
