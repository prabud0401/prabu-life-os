import http from "http";
import fs from "fs/promises";
import path from "path";
import os from "os";

export interface OAuth2Config {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  redirectPort?: number;
  mcpName: string;
}

interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // unix ms
}

const DEFAULT_PORT = 3001;

function cacheFile(mcpName: string): string {
  return path.join(os.homedir(), ".blueocean-mcp", `${mcpName}-oauth2-tokens.json`);
}

async function saveTokens(mcpName: string, data: TokenData): Promise<void> {
  const file = cacheFile(mcpName);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data), "utf-8");
}

async function loadTokens(mcpName: string): Promise<TokenData | null> {
  try {
    const raw = await fs.readFile(cacheFile(mcpName), "utf-8");
    return JSON.parse(raw) as TokenData;
  } catch {
    return null;
  }
}

async function exchangeCode(
  config: OAuth2Config,
  code: string,
  redirectUri: string
): Promise<TokenData> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) throw new Error(`Token exchange failed (${res.status}): ${await res.text()}`);

  const data = (await res.json()) as Record<string, unknown>;
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string | undefined,
    expiresAt: Date.now() + ((data.expires_in as number) ?? 3600) * 1000,
  };
}

async function doRefresh(
  config: OAuth2Config,
  refreshTokenStr: string
): Promise<TokenData> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshTokenStr,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const res = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) throw new Error(`Token refresh failed (${res.status}): ${await res.text()}`);

  const data = (await res.json()) as Record<string, unknown>;
  return {
    accessToken: data.access_token as string,
    refreshToken: (data.refresh_token as string | undefined) ?? refreshTokenStr,
    expiresAt: Date.now() + ((data.expires_in as number) ?? 3600) * 1000,
  };
}

export async function runOAuth2Flow(config: OAuth2Config): Promise<void> {
  const port = config.redirectPort ?? DEFAULT_PORT;
  const redirectUri = `http://localhost:${port}/callback`;
  const scopeStr = config.scopes.join(" ");

  const authUrl =
    `${config.authorizationUrl}` +
    `?response_type=code` +
    `&client_id=${encodeURIComponent(config.clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scopeStr)}`;

  process.stderr.write(`\nOpen this URL in your browser to sign in:\n\n  ${authUrl}\n\nWaiting for sign-in...\n`);

  await new Promise<void>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url!, `http://localhost:${port}`);
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");

        if (error) {
          const desc = url.searchParams.get("error_description") ?? error;
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(`<html><body><h2>Authentication failed</h2><p>${desc}</p></body></html>`);
          server.close(() => reject(new Error(desc ?? error)));
          return;
        }

        if (code) {
          const tokens = await exchangeCode(config, code, redirectUri);
          await saveTokens(config.mcpName, tokens);
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
    server.listen(port);
  });

  process.stderr.write("Token saved.\n");
}

export async function getOAuth2AccessToken(config: OAuth2Config): Promise<string | null> {
  const tokens = await loadTokens(config.mcpName);
  if (!tokens) return null;

  // Refresh proactively if expiring within 5 minutes
  if (tokens.expiresAt - Date.now() < 5 * 60 * 1000) {
    if (!tokens.refreshToken) return null;
    try {
      const refreshed = await doRefresh(config, tokens.refreshToken);
      await saveTokens(config.mcpName, refreshed);
      return refreshed.accessToken;
    } catch {
      return null;
    }
  }

  return tokens.accessToken;
}

export async function isOAuth2Authenticated(config: OAuth2Config): Promise<boolean> {
  return (await getOAuth2AccessToken(config)) !== null;
}
