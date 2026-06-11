"use strict";

/**
 * Backfill migration: ranking write protection (feature 037).
 *
 * Repairs all existing RankingPlace / RankingLastPlace rows so they satisfy
 * the federation derivation rule:
 *   - single, double, mix are NOT NULL
 *   - GREATEST(single,double,mix) <= LEAST(single,double,mix) + maxDiffLevels
 *   - GREATEST(single,double,mix) <= amountOfLevels
 *
 * Two-pass approach (batched, no model hooks):
 *   Pass 1 — carry-forward: fills NULLs with the player's most recent earlier
 *             non-null value for that category (window function over partitioned rows).
 *   Pass 2 — derive/clamp: fills remaining NULLs with amountOfLevels, then
 *             clamps each category to LEAST(best + maxDiffLevels, amountOfLevels).
 *
 * Runs in LIMIT 50000 batches until 0 rows remain per pass.
 * Scoped only to systems with both amountOfLevels and maxDiffLevels configured.
 *
 * DOWN: documented no-op — derived values are indistinguishable from official
 * ones afterwards; accepted trade-off (see plan.md Complexity Tracking).
 */

const BATCH_SIZE = 50000;

/**
 * Runs one pass (SQL) in batches until 0 rows are affected.
 * @param {import('sequelize').QueryInterface} queryInterface
 * @param {string} sql - MUST include a LIMIT clause and a WHERE scoping condition.
 * @param {string} label - for logging
 */
async function runBatched(queryInterface, sql, label) {
  let totalRows = 0;
  let iteration = 0;

  while (true) {
    iteration++;
    const [[result]] = await queryInterface.sequelize.query(sql, {
      type: queryInterface.sequelize.QueryTypes.SELECT,
    });
    const rowCount = parseInt(result?.rowCount ?? result?.count ?? "0", 10);
    if (isNaN(rowCount) || rowCount === 0) break;
    totalRows += rowCount;
    console.log(
      `  [${label}] iteration ${iteration}: ${rowCount} rows updated (total so far: ${totalRows})`
    );
  }
  console.log(`  [${label}] done — ${totalRows} rows updated in ${iteration - 1} iteration(s)`);
}

/**
 * Carry-forward pass for one table: fills NULL categories with the most recent
 * earlier non-null value for that player+system.
 */
function carryForwardSQL(table) {
  return `
WITH to_fill AS (
  SELECT rp.id,
         (SELECT rp2.single FROM ${table} rp2
           WHERE rp2."playerId" = rp."playerId"
             AND rp2."systemId" = rp."systemId"
             AND rp2.single IS NOT NULL
             AND rp2."rankingDate" < rp."rankingDate"
           ORDER BY rp2."rankingDate" DESC
           LIMIT 1) AS prev_single,
         (SELECT rp2.double FROM ${table} rp2
           WHERE rp2."playerId" = rp."playerId"
             AND rp2."systemId" = rp."systemId"
             AND rp2.double IS NOT NULL
             AND rp2."rankingDate" < rp."rankingDate"
           ORDER BY rp2."rankingDate" DESC
           LIMIT 1) AS prev_double,
         (SELECT rp2.mix FROM ${table} rp2
           WHERE rp2."playerId" = rp."playerId"
             AND rp2."systemId" = rp."systemId"
             AND rp2.mix IS NOT NULL
             AND rp2."rankingDate" < rp."rankingDate"
           ORDER BY rp2."rankingDate" DESC
           LIMIT 1) AS prev_mix
  FROM ${table} rp
  WHERE (rp.single IS NULL OR rp.double IS NULL OR rp.mix IS NULL)
  LIMIT ${BATCH_SIZE}
),
updated AS (
  UPDATE ${table} rp
  SET
    single = COALESCE(rp.single, tf.prev_single),
    double = COALESCE(rp.double, tf.prev_double),
    mix    = COALESCE(rp.mix,    tf.prev_mix)
  FROM to_fill tf
  WHERE rp.id = tf.id
    AND (tf.prev_single IS NOT NULL OR tf.prev_double IS NOT NULL OR tf.prev_mix IS NOT NULL)
  RETURNING rp.id
)
SELECT count(*) AS rowcount FROM updated;
  `.trim();
}

/**
 * Derive/clamp pass for one table: fills remaining NULLs with amountOfLevels,
 * then clamps spread and caps to amountOfLevels.
 *
 * Formula (equivalent to getRankingProtected in TypeScript):
 *   col = LEAST(COALESCE(col, aol), best + mdl, aol)
 * where:
 *   aol  = amountOfLevels
 *   mdl  = maxDiffLevels
 *   best = LEAST(COALESCE(single,aol), COALESCE(double,aol), COALESCE(mix,aol))
 */
function deriveClampSQL(table) {
  return `
WITH to_fix AS (
  SELECT rp.id,
         s."amountOfLevels"  AS aol,
         s."maxDiffLevels"   AS mdl
  FROM ${table} rp
  JOIN ranking."RankingSystems" s ON s.id = rp."systemId"
  WHERE s."amountOfLevels" IS NOT NULL
    AND s."maxDiffLevels"  IS NOT NULL
    AND (
      rp.single IS NULL OR rp.double IS NULL OR rp.mix IS NULL
      OR GREATEST(rp.single, rp.double, rp.mix)
         > LEAST(rp.single, rp.double, rp.mix) + s."maxDiffLevels"
      OR GREATEST(rp.single, rp.double, rp.mix) > s."amountOfLevels"
    )
  LIMIT ${BATCH_SIZE}
),
updated AS (
  UPDATE ${table} rp
  SET
    single = LEAST(
               COALESCE(rp.single, tf.aol),
               LEAST(COALESCE(rp.single, tf.aol), COALESCE(rp.double, tf.aol), COALESCE(rp.mix, tf.aol)) + tf.mdl,
               tf.aol
             ),
    double = LEAST(
               COALESCE(rp.double, tf.aol),
               LEAST(COALESCE(rp.single, tf.aol), COALESCE(rp.double, tf.aol), COALESCE(rp.mix, tf.aol)) + tf.mdl,
               tf.aol
             ),
    mix    = LEAST(
               COALESCE(rp.mix, tf.aol),
               LEAST(COALESCE(rp.single, tf.aol), COALESCE(rp.double, tf.aol), COALESCE(rp.mix, tf.aol)) + tf.mdl,
               tf.aol
             )
  FROM to_fix tf
  WHERE rp.id = tf.id
  RETURNING rp.id
)
SELECT count(*) AS rowcount FROM updated;
  `.trim();
}

module.exports = {
  async up(queryInterface) {
    const tables = ['ranking."RankingPlaces"', 'ranking."RankingLastPlaces"'];

    for (const table of tables) {
      console.log(`\nBackfill [${table}]: Pass 1 — carry-forward`);
      await runBatched(queryInterface, carryForwardSQL(table), `${table} carry-forward`);

      console.log(`\nBackfill [${table}]: Pass 2 — derive/clamp`);
      await runBatched(queryInterface, deriveClampSQL(table), `${table} derive-clamp`);
    }

    console.log("\nBackfill migration complete.");
  },

  async down(_queryInterface) {
    // DOWN is intentionally a no-op.
    //
    // Derived values are indistinguishable from official ones once written.
    // The repair pass is irreversible by design — if maxDiffLevels ever changes,
    // re-run the up() pass after updating the system configuration.
    //
    // See: specs/037-ranking-write-protection/plan.md (Complexity Tracking)
    console.log(
      "Backfill migration down() is a no-op by design. " +
        "See specs/037-ranking-write-protection/plan.md for rationale."
    );
  },
};
