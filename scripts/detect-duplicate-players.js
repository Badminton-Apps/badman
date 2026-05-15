#!/usr/bin/env node
/**
 * detect-duplicate-players.js
 *
 * Compares twizzit.shadow_contact (populated by spec 016) against
 * public."Players" to find duplicate Badman player records.
 *
 * A duplicate is confirmed when 2+ Badman Players match the same
 * Twizzit shadow contact.
 *
 * Matching:
 *   Pass 1 (primary)  — memberId exact match
 *   Pass 2 (fallback) — firstName + lastName + DOB when memberId missing
 *
 * Also flags Players missing a memberId when the matching shadow contact has one.
 *
 * Prerequisites:
 *   Spec 016 (016-twizzit-shadow-sync) must have been run and
 *   twizzit.shadow_contact must be populated before running this script.
 *
 * Usage:
 *   node scripts/detect-duplicate-players.js [options]
 *
 * Options:
 *   --env <name>   Env file to load: "staging" → .env.staging, "prod" → .env.prod-db
 *                  Default: .env (local)
 *   --dry-run      No-op for this read-only script; CSV is still written
 *
 * Examples:
 *   node scripts/detect-duplicate-players.js --dry-run
 *   node scripts/detect-duplicate-players.js --env staging
 *   node scripts/detect-duplicate-players.js --env prod
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
=== detect-duplicate-players ===
  env:     ${ENV_NAME ?? "local (.env)"}
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

// ── groupId counters (T003) ───────────────────────────────────────────────────
let mbCounter = 0;
let nkCounter = 0;
let nmCounter = 0;

function nextMbGroupId() {
  mbCounter++;
  return `MB-${mbCounter}`;
}
function nextNkGroupId() {
  nkCounter++;
  return `NK-${nkCounter}`;
}
function nextNmGroupId() {
  nmCounter++;
  return `NM-${nmCounter}`;
}

// ── CSV writer (T004) ─────────────────────────────────────────────────────────
const CSV_COLUMNS = [
  "groupId",
  "matchReason",
  "twizzitId",
  "memberId",
  "badmanPlayerId",
  "firstName",
  "lastName",
  "dateOfBirth",
  "gender",
  "email",
  "missingMemberId",
  "suggestedMemberId",
];

function csvEscape(val) {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsvRow(obj) {
  return CSV_COLUMNS.map((col) => csvEscape(obj[col])).join(",");
}

function writeCsv(rows) {
  const csvPath = path.join(
    __dirname,
    `duplicate-report-${ENV_NAME ?? "local"}-${new Date().toISOString().slice(0, 10)}.csv`
  );
  const lines = [CSV_COLUMNS.join(","), ...rows.map(buildCsvRow)];
  fs.writeFileSync(csvPath, lines.join("\n"), "utf8");
  return csvPath;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  await client.connect();
  console.log("Connected to database.\n");

  try {
    // T002 — Shadow table empty guard
    let shadowTotal = 0;
    try {
      const countRes = await client.query(
        `SELECT COUNT(*)::int AS total FROM twizzit.shadow_contact`
      );
      shadowTotal = countRes.rows[0].total;
    } catch (err) {
      if (err.code === "42P01") {
        console.error(
          "ERROR: twizzit.shadow_contact does not exist.\n" +
            "Run spec 016 (016-twizzit-shadow-sync) first to create and populate the shadow tables."
        );
        process.exit(1);
      }
      throw err;
    }
    if (shadowTotal === 0) {
      console.error(
        "ERROR: twizzit.shadow_contact is empty.\n" +
          "Run spec 016 (016-twizzit-shadow-sync) first to populate the shadow tables."
      );
      process.exit(1);
    }
    console.log(`Shadow contacts: ${shadowTotal.toLocaleString()}`);

    // ── Pre-flight: memberId match rate ───────────────────────────────────────
    const matchRateRes = await client.query(`
      SELECT
        COUNT(*)::int                                             AS total_players,
        COUNT(*) FILTER (WHERE p."memberId" LIKE 'unknown-%')::int AS unknown_count,
        COUNT(*) FILTER (WHERE p."memberId" IS NULL)::int          AS null_count,
        COUNT(*) FILTER (
          WHERE p."memberId" IS NOT NULL
            AND p."memberId" NOT LIKE 'unknown-%'
        )::int                                                    AS real_member_id_count,
        COUNT(sc.twizzit_id)::int                                 AS matched_in_shadow
      FROM public."Players" p
      LEFT JOIN twizzit.shadow_contact sc ON sc.member_id = p."memberId"
      WHERE p."memberId" IS NOT NULL
        AND p."memberId" NOT LIKE 'unknown-%'
    `);

    const mr = matchRateRes.rows[0];
    const matchPct =
      mr.real_member_id_count > 0
        ? ((mr.matched_in_shadow / mr.real_member_id_count) * 100).toFixed(1)
        : "0.0";

    console.log(`\n── Pre-flight: memberId match rate ──────────────────────`);
    console.log(`  Total Badman players:          ${mr.total_players.toLocaleString()}`);
    console.log(`  Real memberId (federation):    ${mr.real_member_id_count.toLocaleString()}`);
    console.log(`  Auto-generated (unknown-):     ${mr.unknown_count.toLocaleString()}`);
    console.log(`  Null memberId:                 ${mr.null_count.toLocaleString()}`);
    console.log(
      `  Matched in shadow_contact:     ${mr.matched_in_shadow.toLocaleString()} (${matchPct}%)`
    );
    console.log(
      `  Unmatched (no shadow entry):   ${(mr.real_member_id_count - mr.matched_in_shadow).toLocaleString()}`
    );

    if (parseFloat(matchPct) < 50) {
      console.log(`\n  ⚠  Match rate below 50% — shadow data may be incomplete.`);
      console.log(`     Verify spec 016 completed a full sync before continuing.\n`);
    } else {
      console.log();
    }

    const allRows = [];
    const pass1PlayerIds = new Set();

    // ── Pass 1: memberId duplicate groups (T005, T006, T007) ─────────────────
    console.log("── Pass 1: memberId matches ──────────────────────────────");

    const pass1Res = await client.query(`
      SELECT
        sc.twizzit_id,
        sc.member_id                                          AS shadow_member_id,
        sc.gender                                            AS shadow_gender,
        array_agg(p.id::text        ORDER BY p.id)           AS player_ids,
        array_agg(p."firstName"     ORDER BY p.id)           AS first_names,
        array_agg(p."lastName"      ORDER BY p.id)           AS last_names,
        array_agg(p."memberId"      ORDER BY p.id)           AS member_ids,
        array_agg(p."dateOfBirth"::text ORDER BY p.id)       AS dobs,
        array_agg(p.gender          ORDER BY p.id)           AS genders,
        array_agg(p.email           ORDER BY p.id)           AS emails
      FROM twizzit.shadow_contact sc
      JOIN public."Players" p ON p."memberId" = sc.member_id
      WHERE sc.member_id IS NOT NULL
        AND p."memberId" IS NOT NULL
        AND p."memberId" NOT LIKE 'U-%'
      GROUP BY sc.twizzit_id, sc.member_id, sc.gender
      HAVING COUNT(p.id) > 1
      ORDER BY COUNT(p.id) DESC, sc.twizzit_id
    `);

    let pass1Groups = 0;
    let pass1Players = 0;

    for (const row of pass1Res.rows) {
      const groupId = nextMbGroupId();
      pass1Groups++;

      for (let i = 0; i < row.player_ids.length; i++) {
        pass1PlayerIds.add(row.player_ids[i]);
        pass1Players++;
        allRows.push({
          groupId,
          matchReason: "member-id-match",
          twizzitId: row.twizzit_id,
          memberId: row.member_ids[i] ?? "",
          badmanPlayerId: row.player_ids[i],
          firstName: row.first_names[i] ?? "",
          lastName: row.last_names[i] ?? "",
          dateOfBirth: row.dobs[i] ?? "",
          gender: row.genders[i] ?? "",
          email: row.emails[i] ?? "",
          missingMemberId: false,
          suggestedMemberId: "",
        });
      }
    }

    console.log(`  Found ${pass1Groups} duplicate group(s) (${pass1Players} affected players)\n`);

    // ── Pass 2: natural-key duplicate groups (T008, T009, T010, T011) ────────
    console.log("── Pass 2: natural-key matches (fallback) ────────────────");

    const excludeIds =
      pass1PlayerIds.size > 0 ? [...pass1PlayerIds] : ["00000000-0000-0000-0000-000000000000"]; // dummy to keep query valid

    const pass2Res = await client.query(
      `
      SELECT
        sc.twizzit_id,
        sc.member_id                                          AS shadow_member_id,
        array_agg(p.id::text        ORDER BY p.id)           AS player_ids,
        array_agg(p."firstName"     ORDER BY p.id)           AS first_names,
        array_agg(p."lastName"      ORDER BY p.id)           AS last_names,
        array_agg(p."memberId"      ORDER BY p.id)           AS member_ids,
        array_agg(p."dateOfBirth"::text ORDER BY p.id)       AS dobs,
        array_agg(p.gender          ORDER BY p.id)           AS genders,
        array_agg(p.email           ORDER BY p.id)           AS emails
      FROM twizzit.shadow_contact sc
      JOIN public."Players" p
        ON  lower(sc.first_name)  = lower(p."firstName")
        AND lower(sc.last_name)   = lower(p."lastName")
        AND sc.date_of_birth IS NOT DISTINCT FROM p."dateOfBirth"
      WHERE (sc.member_id IS NULL OR p."memberId" IS NULL OR p."memberId" LIKE 'unknown-%')
        AND p.id::text != ALL($1)
      GROUP BY sc.twizzit_id, sc.member_id
      HAVING COUNT(p.id) > 1
      ORDER BY COUNT(p.id) DESC, sc.twizzit_id
      `,
      [excludeIds]
    );

    let pass2Groups = 0;
    let pass2Players = 0;
    let missingMemberIdCount = 0;

    for (const row of pass2Res.rows) {
      const groupId = nextNkGroupId();
      pass2Groups++;

      for (let i = 0; i < row.player_ids.length; i++) {
        pass2Players++;
        const playerHasNoMemberId = !row.member_ids[i] || row.member_ids[i].startsWith("unknown-");
        const shadowHasMemberId = !!row.shadow_member_id;
        const isMissing = playerHasNoMemberId && shadowHasMemberId;
        if (isMissing) missingMemberIdCount++;

        allRows.push({
          groupId,
          matchReason: "natural-key-match",
          twizzitId: row.twizzit_id,
          memberId: row.member_ids[i] ?? "",
          badmanPlayerId: row.player_ids[i],
          firstName: row.first_names[i] ?? "",
          lastName: row.last_names[i] ?? "",
          dateOfBirth: row.dobs[i] ?? "",
          gender: row.genders[i] ?? "",
          email: row.emails[i] ?? "",
          missingMemberId: isMissing,
          suggestedMemberId: isMissing ? (row.shadow_member_id ?? "") : "",
        });
      }
    }

    console.log(`  Found ${pass2Groups} duplicate group(s) (${pass2Players} affected players)`);
    if (missingMemberIdCount > 0) {
      console.log(`  Players flagged with missing memberId: ${missingMemberIdCount}`);
    }

    // ── Pass 3: same name, different memberId ─────────────────────────────────
    console.log("\n── Pass 3: name match with conflicting memberId ──────────");

    const allFoundPlayerIds = new Set([
      ...pass1PlayerIds,
      ...pass2Res.rows.flatMap((r) => r.player_ids),
    ]);

    const pass3Res = await client.query(
      `
      SELECT
        sc.twizzit_id,
        sc.member_id                                          AS shadow_member_id,
        sc.first_name                                         AS shadow_first_name,
        sc.last_name                                          AS shadow_last_name,
        p.id::text                                            AS player_id,
        p."firstName"                                         AS first_name,
        p."lastName"                                          AS last_name,
        p."memberId"                                          AS player_member_id,
        p."dateOfBirth"::text                                 AS dob,
        p.gender,
        p.email
      FROM twizzit.shadow_contact sc
      JOIN public."Players" p
        ON  lower(sc.first_name) = lower(p."firstName")
        AND lower(sc.last_name)  = lower(p."lastName")
      WHERE sc.member_id IS NOT NULL
        AND p."memberId" IS NOT NULL
        AND p."memberId" NOT LIKE 'U-%'
        AND sc.member_id <> p."memberId"
        AND p.id::text != ALL($1)
      ORDER BY sc.last_name, sc.first_name, sc.twizzit_id
      `,
      [
        [...allFoundPlayerIds].length > 0
          ? [...allFoundPlayerIds]
          : ["00000000-0000-0000-0000-000000000000"],
      ]
    );

    let pass3Count = 0;
    for (const row of pass3Res.rows) {
      pass3Count++;
      allRows.push({
        groupId: nextNmGroupId(),
        matchReason: "name-match-id-mismatch",
        twizzitId: row.twizzit_id,
        memberId: row.player_member_id ?? "",
        badmanPlayerId: row.player_id,
        firstName: row.first_name ?? "",
        lastName: row.last_name ?? "",
        dateOfBirth: row.dob ?? "",
        gender: row.gender ?? "",
        email: row.email ?? "",
        missingMemberId: false,
        suggestedMemberId: row.shadow_member_id ?? "",
      });
    }

    console.log(`  Found ${pass3Count} player(s) with name match but conflicting memberId\n`);

    // ── Write CSV + summary (T012, T013, T014) ────────────────────────────────
    const csvPath = writeCsv(allRows);
    const totalGroups = pass1Groups + pass2Groups;
    const totalPlayers = pass1Players + pass2Players;

    console.log(`\n── Summary ──────────────────────────────────────────────`);
    console.log(`  Total duplicate groups:              ${totalGroups}`);
    console.log(`  Total affected players:              ${totalPlayers}`);
    if (missingMemberIdCount > 0) {
      console.log(`  Players missing memberId (suggested): ${missingMemberIdCount}`);
    }
    console.log(`  CSV written to: ${csvPath}`);

    if (totalGroups > 0) {
      console.log("\n  Group | Reason | Players");
      for (const row of allRows) {
        if (
          allRows.indexOf(row) === 0 ||
          allRows[allRows.indexOf(row) - 1].groupId !== row.groupId
        ) {
          const groupRows = allRows.filter((r) => r.groupId === row.groupId);
          console.log(
            `  ${row.groupId} | ${row.matchReason} | ${groupRows.map((r) => `${r.firstName} ${r.lastName}`).join(", ")}`
          );
        }
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
