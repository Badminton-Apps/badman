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

  const rows = await queryWithRetry(`
    SELECT n.nspname AS schema, c.relname AS index
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indexrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE NOT i.indisvalid
    ORDER BY n.nspname, c.relname;
  `);

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

/**
 * Connect and run the query, retrying on transient connection failures
 * (runner network blips, brief DB unavailability). A new Client per attempt:
 * pg Clients are single-use after a failed connect.
 */
async function queryWithRetry(sql, attempts = 3, delayMs = 5000) {
  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const client = new Client({
      host: process.env.DB_IP,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_DATABASE,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 15000,
    });
    try {
      await client.connect();
      const { rows } = await client.query(sql);
      await client.end();
      return rows;
    } catch (err) {
      lastErr = err;
      await client.end().catch(() => {});
      console.error(`[check-invalid-indexes] attempt ${attempt}/${attempts} failed:`, describe(err));
      if (attempt < attempts) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

/**
 * AggregateError (e.g. multi-address ECONNREFUSED) has an empty .message;
 * unwrap it so CI logs show the actual cause instead of a blank line.
 */
function describe(err) {
  if (err instanceof AggregateError) {
    const parts = err.errors.map((e) => e.message || e.code || String(e));
    return `AggregateError: [${parts.join("; ")}]`;
  }
  return err.message || err.code || String(err);
}

main().catch((err) => {
  console.error("[check-invalid-indexes] ERROR:", describe(err));
  if (err.stack) console.error(err.stack);
  process.exit(2);
});
