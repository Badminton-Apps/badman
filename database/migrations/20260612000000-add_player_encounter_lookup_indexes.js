"use strict";

/**
 * Indexes supporting the playerEncounterCompetitions query (CTE + UNION rewrite).
 *
 * Targets:
 *  - completed CTE: partial index on Games(linkId) for competition games with a
 *    winner — tiny, index-only GROUP BY with no heap access needed.
 *  - encounter-level player fields: gameLeaderId, tempHomeCaptainId,
 *    tempAwayCaptainId — one index each, used by UNION branch 1.
 *  - Teams(captainId) — used by UNION branches 2 & 3.
 *
 * TeamPlayerMemberships(playerId, teamId) already exists as player_team_index.
 * GamePlayerMemberships(playerId) already exists via Sequelize @Index decorator.
 * Games(linkId, linkType) already exists as game_parent_index.
 *
 * All created CONCURRENTLY to avoid table locks in production.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  useTransaction: false,

  up: async (queryInterface) => {
    await queryInterface.sequelize.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "games_completed_competition_idx"
       ON event."Games" ("linkId")
       WHERE "linkType" = 'competition' AND "winner" IS NOT NULL AND "winner" != 0`
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "encounter_game_leader_idx"
       ON event."EncounterCompetitions" ("gameLeaderId")
       WHERE "gameLeaderId" IS NOT NULL`
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "encounter_temp_home_captain_idx"
       ON event."EncounterCompetitions" ("tempHomeCaptainId")
       WHERE "tempHomeCaptainId" IS NOT NULL`
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "encounter_temp_away_captain_idx"
       ON event."EncounterCompetitions" ("tempAwayCaptainId")
       WHERE "tempAwayCaptainId" IS NOT NULL`
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "teams_captain_idx"
       ON public."Teams" ("captainId")
       WHERE "captainId" IS NOT NULL`
    );
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      `DROP INDEX CONCURRENTLY IF EXISTS event."games_completed_competition_idx"`
    );
    await queryInterface.sequelize.query(
      `DROP INDEX CONCURRENTLY IF EXISTS event."encounter_game_leader_idx"`
    );
    await queryInterface.sequelize.query(
      `DROP INDEX CONCURRENTLY IF EXISTS event."encounter_temp_home_captain_idx"`
    );
    await queryInterface.sequelize.query(
      `DROP INDEX CONCURRENTLY IF EXISTS event."encounter_temp_away_captain_idx"`
    );
    await queryInterface.sequelize.query(
      `DROP INDEX CONCURRENTLY IF EXISTS public."teams_captain_idx"`
    );
  },
};
