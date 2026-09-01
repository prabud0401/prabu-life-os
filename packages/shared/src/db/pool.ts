import pg from "pg";
import { logger } from "../utils/logger";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(getDatabaseUrl());
}

export function getPool(): pg.Pool {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes("railway.internal")
        ? false
        : { rejectUnauthorized: false },
    });

    pool.on("error", (err) => {
      logger.error(`Postgres pool error: ${err.message}`);
    });
  }

  return pool;
}

export async function pingDatabase(): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    return false;
  }

  const client = await getPool().connect();
  try {
    await client.query("SELECT 1");
    return true;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
