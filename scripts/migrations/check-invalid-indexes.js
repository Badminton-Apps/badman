#!/usr/bin/env node
/**
 * Pre-flight check for the CI migration runner.
 *
 * Fails (exit code 1) if any index in the target database is marked invalid
 * (typically left behind by an interrupted CREATE INDEX CONCURRENTLY).
 * Sequelize itself does not detect this; surfacing it here prevents the
 * migration runner from silently re-attempting and leaving the database
 * in an unrecoverable state.
 *
 * Reads connection parameters from the same env vars as database/config/config.js:
 *   DB_IP, DB_PORT, DB_DATABASE, DB_USER, DB_PASSWORD, DB_SSL
 */

const { Client } = require("pg");

async function main() {
  const required = ["DB_IP", "DB_PORT", "DB_DATABASE", "DB_USER", "DB_PASSWORD"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`[check-invalid-indexes] Missing env vars: ${missing.join(", ")}`);
    process.exit(2);
  }

  const client = new Client({
    host: process.env.DB_IP,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  });

  await client.connect();

  const { rows } = await client.query(`
    SELECT n.nspname AS schema, c.relname AS index
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indexrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE NOT i.indisvalid
    ORDER BY n.nspname, c.relname;
  `);

  await client.end();

  if (rows.length === 0) {
    console.log("[check-invalid-indexes] OK — no invalid indexes.");
    return;
  }

  console.error("[check-invalid-indexes] FAIL — invalid index(es) detected:");
  for (const r of rows) {
    console.error(`  - "${r.schema}"."${r.index}"`);
  }
  console.error("");
  console.error("Remediation: connect to the target database and run:");
  for (const r of rows) {
    console.error(`  DROP INDEX CONCURRENTLY "${r.schema}"."${r.index}";`);
  }
  console.error("");
  console.error("Then investigate why the previous migration run was interrupted before re-running this workflow.");
  process.exit(1);
}

main().catch((err) => {
  console.error("[check-invalid-indexes] ERROR:", err.message);
  process.exit(2);
});
