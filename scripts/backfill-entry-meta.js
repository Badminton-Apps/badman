#!/usr/bin/env node
/**
 * backfill-entry-meta.js
 *
 * Backfills EventEntry.meta.competition.players for entries created in the
 * past N days that are missing base-player data.
 * Also outputs a CSV of club contact emails from EnrollmentSubmitted logs.
 *
 * Usage:
 *   node scripts/backfill-entry-meta.js [options]
 *
 * Options:
 *   --env <name>     Env file to load: "staging" → .env.staging, "prod" → .env.prod-db
 *                    Default: .env (local)
 *   --days <n>       Look back N days (default: 7)
 *   --dry-run        Print what would be written, no DB updates
 *
 * Examples:
 *   node scripts/backfill-entry-meta.js --dry-run
 *   node scripts/backfill-entry-meta.js --env staging
 *   node scripts/backfill-entry-meta.js --env prod --days 14
 */

"use strict";

const path = require("path");
const fs = require("fs");
const { Client } = require("pg");

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag, def) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
};
const DRY_RUN = args.includes("--dry-run");
const ENV_NAME = getArg("--env", null);
const DAYS = parseInt(getArg("--days", "7"), 10);

// ── Load env ──────────────────────────────────────────────────────────────────
const root = path.resolve(__dirname, "..");
if (ENV_NAME === "prod") {
  require("dotenv").config({ path: path.join(root, ".env.prod-db"), override: true });
} else if (ENV_NAME === "staging") {
  require("dotenv").config({ path: path.join(root, ".env.staging"), override: true });
} else {
  require("dotenv").config({ path: path.join(root, ".env"), override: true });
}

console.log(`
=== backfill-entry-meta ===
  env:     ${ENV_NAME ?? "local (.env)"}
  days:    ${DAYS}
  dry-run: ${DRY_RUN}
  DB:      ${process.env.DB_IP}:${process.env.DB_PORT ?? 5432}/${process.env.DB_DATABASE}
`);

// ── DB client ─────────────────────────────────────────────────────────────────
const client = new Client({
  host: process.env.DB_IP,
  port: parseInt(process.env.DB_PORT ?? "5432", 10),
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

// ── Index calculation (mirrors IndexCalculationService logic) ─────────────────

/**
 * June 10 cutoff for a given season year.
 * moment([season, 5, 10]) → season-06-10 (month is 0-indexed in moment).
 */
function rankingCutoff(season) {
  return new Date(season, 5, 10); // month is 0-indexed: 5 = June
}

function sumNonMixed(s, d, defaultRanking) {
  return (s ?? defaultRanking) + (d ?? defaultRanking);
}

function sumMixed(s, d, m, defaultRanking) {
  return (s ?? defaultRanking) + (d ?? defaultRanking) + (m ?? defaultRanking);
}

function getBestPlayers(type, players, defaultRanking) {
  if (type !== "MX") {
    return [...players]
      .sort(
        (a, b) =>
          sumNonMixed(a.single, a.double, defaultRanking) -
          sumNonMixed(b.single, b.double, defaultRanking)
      )
      .slice(0, 4);
  }
  const males = [...players.filter((p) => p.gender === "M")]
    .sort(
      (a, b) =>
        sumMixed(a.single, a.double, a.mix, defaultRanking) -
        sumMixed(b.single, b.double, b.mix, defaultRanking)
    )
    .slice(0, 2);
  const females = [...players.filter((p) => p.gender === "F")]
    .sort(
      (a, b) =>
        sumMixed(a.single, a.double, a.mix, defaultRanking) -
        sumMixed(b.single, b.double, b.mix, defaultRanking)
    )
    .slice(0, 2);
  return [...males, ...females];
}

function getIndexFromPlayers(type, players, defaultRanking) {
  if (type !== "MX") {
    const best = getBestPlayers(type, players, defaultRanking);
    const missing = (4 - best.length) * 24;
    return best.reduce((sum, p) => sum + sumNonMixed(p.single, p.double, defaultRanking), missing);
  }
  const best = getBestPlayers(type, players, defaultRanking);
  const missing = (4 - best.length) * 36;
  return best.reduce(
    (sum, p) => sum + sumMixed(p.single, p.double, p.mix, defaultRanking),
    missing
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  await client.connect();
  console.log("Connected to database.\n");

  try {
    // 1. Primary ranking system
    const sysRes = await client.query(
      `SELECT id, "amountOfLevels" FROM ranking."RankingSystems" WHERE "primary" = true LIMIT 1`
    );
    if (sysRes.rows.length === 0) {
      console.error("No primary ranking system found. Aborting.");
      process.exit(1);
    }
    const { id: systemId, amountOfLevels } = sysRes.rows[0];
    const defaultRanking = (amountOfLevels ?? 12) + 2;
    console.log(
      `Primary ranking system: ${systemId} (amountOfLevels=${amountOfLevels}, default=${defaultRanking})\n`
    );

    // 2. Find entries from past N days missing meta
    const entriesRes = await client.query(
      `SELECT e.id, e."teamId", e."subEventId", e.meta,
              t.type, t.season, t."clubId"
       FROM event."Entries" e
       JOIN public."Teams" t ON t.id = e."teamId"
       WHERE e."createdAt" >= NOW() - ($1 || ' days')::INTERVAL
         AND e."teamId" IS NOT NULL
         AND e."subEventId" IS NOT NULL
         AND (
           e.meta IS NULL
           OR e.meta->'competition' IS NULL
           OR e.meta->'competition'->'players' IS NULL
           OR json_array_length(e.meta->'competition'->'players') = 0
         )`,
      [DAYS]
    );

    const entries = entriesRes.rows;
    console.log(`Found ${entries.length} entries to backfill.\n`);

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const entry of entries) {
      try {
        // 3. Get REGULAR players for the team
        const playersRes = await client.query(
          `SELECT tpm."playerId", p.gender
           FROM public."TeamPlayerMemberships" tpm
           JOIN public."Players" p ON p.id = tpm."playerId"
           WHERE tpm."teamId" = $1
             AND tpm.end IS NULL
             AND tpm."membershipType" = 'REGULAR'`,
          [entry.teamId]
        );

        if (playersRes.rows.length === 0) {
          console.log(`  [SKIP] entry ${entry.id} — team ${entry.teamId} has no REGULAR players`);
          skipped++;
          continue;
        }

        const cutoff = rankingCutoff(entry.season);

        // 4. Get ranking place for each player at the June 10 cutoff
        const resolvedPlayers = [];
        for (const { playerId, gender } of playersRes.rows) {
          const rankRes = await client.query(
            `SELECT single, double, mix
             FROM ranking."RankingPlaces"
             WHERE "playerId" = $1
               AND "systemId" = $2
               AND "rankingDate" <= $3
             ORDER BY "rankingDate" DESC
             LIMIT 1`,
            [playerId, systemId, cutoff]
          );

          const place = rankRes.rows[0];
          const single = place?.single ?? defaultRanking;
          const double = place?.double ?? defaultRanking;
          const mix = place?.mix ?? defaultRanking;

          // min+2 fallback: if a discipline is missing, use min(s,d,m)+2
          const minVal = Math.min(single, double, mix);
          resolvedPlayers.push({
            id: playerId,
            gender: gender ?? null,
            single: place?.single ?? minVal + 2,
            double: place?.double ?? minVal + 2,
            mix: place?.mix ?? minVal + 2,
          });
        }

        // 5. Calculate teamIndex
        const teamIndex = getIndexFromPlayers(entry.type, resolvedPlayers, defaultRanking);

        // 6. Build meta
        const competitionPlayers = resolvedPlayers.map((p) => ({
          id: p.id,
          gender: p.gender,
          single: p.single,
          double: p.double,
          mix: p.mix,
          levelException: false,
          levelExceptionRequested: false,
        }));

        const newMeta = {
          ...(entry.meta ?? {}),
          competition: {
            teamIndex,
            players: competitionPlayers,
          },
        };

        if (DRY_RUN) {
          console.log(
            `  [DRY-RUN] entry ${entry.id} | team ${entry.teamId} | type ${entry.type} | season ${entry.season}`
          );
          console.log(
            `    players: ${competitionPlayers.map((p) => `${p.id}(${p.gender})`).join(", ")}`
          );
          console.log(`    teamIndex: ${teamIndex}`);
        } else {
          await client.query(
            `UPDATE event."Entries" SET meta = $1, "updatedAt" = NOW() WHERE id = $2`,
            [JSON.stringify(newMeta), entry.id]
          );
          console.log(
            `  [UPDATED] entry ${entry.id} | type ${entry.type} | ${competitionPlayers.length} players | teamIndex ${teamIndex}`
          );
        }

        updated++;
      } catch (err) {
        console.error(`  [ERROR] entry ${entry.id}: ${err.message}`);
        failed++;
      }
    }

    console.log(`\n── Summary ──────────────────────────────`);
    console.log(`  ${DRY_RUN ? "Would update" : "Updated"}: ${updated}`);
    console.log(`  Skipped:  ${skipped}`);
    console.log(`  Failed:   ${failed}`);

    // 7. Extract enrollment emails from Logging
    console.log(`\n── Enrollment emails (past ${DAYS} days) ─`);
    const logsRes = await client.query(
      `SELECT DISTINCT ON (l.meta->>'clubId')
              l.meta->>'clubId'        AS "clubId",
              c.name                   AS "clubName",
              c."contactCompetition"   AS "contactEmail",
              p."firstName",
              p."lastName",
              p.email                  AS "submitterEmail",
              l."createdAt"            AS "submittedAt"
       FROM system."Logs" l
       JOIN public."Players" p ON p.id = l."playerId"
       JOIN public."Clubs"   c ON c.id = (l.meta->>'clubId')::uuid
       WHERE l.action = 'EnrollmentSubmitted'
         AND l."createdAt" >= NOW() - ($1 || ' days')::INTERVAL
       ORDER BY l.meta->>'clubId', l."createdAt" DESC`,
      [DAYS]
    );

    const rows = logsRes.rows;
    console.log(`  Found ${rows.length} clubs that enrolled.\n`);

    // Write CSV
    const csvLines = [
      "clubId,clubName,contactEmail,submitterFirstName,submitterLastName,submitterEmail,submittedAt",
      ...rows.map((r) =>
        [
          r.clubId,
          `"${(r.clubName ?? "").replace(/"/g, '""')}"`,
          r.contactEmail ?? "",
          r.firstName ?? "",
          r.lastName ?? "",
          r.submitterEmail ?? "",
          r.submittedAt?.toISOString() ?? "",
        ].join(",")
      ),
    ];

    const csvPath = path.join(
      __dirname,
      `enrollment-emails-${ENV_NAME ?? "local"}-${new Date().toISOString().slice(0, 10)}.csv`
    );
    fs.writeFileSync(csvPath, csvLines.join("\n"), "utf8");
    console.log(`  CSV written to: ${csvPath}`);

    if (rows.length > 0) {
      console.log("\n  Club | Contact email | Submitted by");
      for (const r of rows) {
        console.log(
          `  ${r.clubName} | ${r.contactEmail ?? "(none)"} | ${r.firstName} ${r.lastName} <${r.submitterEmail ?? "(none)"}>`
        );
      }
    }
  } finally {
    await client.end();
    console.log("\nDone.");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
