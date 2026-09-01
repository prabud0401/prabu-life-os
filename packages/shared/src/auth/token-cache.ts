import fs from "fs/promises";
import path from "path";
import os from "os";
import type { ICachePlugin, TokenCacheContext } from "@azure/msal-node";

export function createFileTokenCache(mcpName: string): ICachePlugin {
  const cacheDir = path.join(os.homedir(), ".blueocean-mcp");
  const cacheFile = path.join(cacheDir, `${mcpName}-tokens.json`);

  return {
    beforeCacheAccess: async (cacheContext: TokenCacheContext) => {
      try {
        await fs.mkdir(cacheDir, { recursive: true });
        const data = await fs.readFile(cacheFile, "utf-8");
        cacheContext.tokenCache.deserialize(data);
      } catch {
        // no cache yet — first run
      }
    },
    afterCacheAccess: async (cacheContext: TokenCacheContext) => {
      if (cacheContext.cacheHasChanged) {
        await fs.mkdir(cacheDir, { recursive: true });
        await fs.writeFile(cacheFile, cacheContext.tokenCache.serialize(), "utf-8");
      }
    },
  };
}
