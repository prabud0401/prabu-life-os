require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const migrationFile = process.argv[2] || "001_initial.sql";
const sqlPath = path.join(__dirname, "..", "migrations", migrationFile);
const sql = fs.readFileSync(sqlPath, "utf8");

(async () => {
  const url = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
  if (!url) {
    console.error("Set DATABASE_URL or DATABASE_PUBLIC_URL");
    process.exit(1);
  }

  console.log(`Running migration: ${migrationFile}`);

  const client = new Client({
    connectionString: url,
    ssl: url.includes("railway.internal") ? false : { rejectUnauthorized: false },
  });

  await client.connect();
  await client.query(sql);
  const tables = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
  );
  console.log("Tables:", tables.rows.map((r) => r.tablename).join(", "));
  await client.end();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
