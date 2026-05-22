"use strict";

/**
 * Add a composite index on ranking."RankingPlaces" tuned for the
 * IndexCalculationService.fetchPlaceMap query:
 *
 *   SELECT DISTINCT ON ("playerId") ...
 *   FROM ranking."RankingPlaces"
 *   WHERE "systemId" = :systemId
 *     AND "rankingDate" <= :cutoff
 *     AND "playerId" IN (:playerIds)
 *   ORDER BY "playerId", "rankingDate" DESC
 *
 * The existing `ranking_index` is keyed (rankingDate, playerId, systemId)
 * which forces a wide scan for this query shape. The new index orders the
 * columns to match the predicate + ORDER BY so Postgres can DISTINCT ON
 * directly off the index.
 *
 * Created CONCURRENTLY in production to avoid locking the table.
 */

const INDEX_NAME = "ranking_places_system_player_date_idx";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  useTransaction: false,
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "${INDEX_NAME}"
       ON ranking."RankingPlaces" ("systemId", "playerId", "rankingDate" DESC)`
    );
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS ranking."${INDEX_NAME}"`
    );
  },
};
