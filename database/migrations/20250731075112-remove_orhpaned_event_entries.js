'use strict';

const { Op } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      console.log('Starting cleanup of orphaned EventEntry records...');

      // Step 1: Find and delete orphaned entries with invalid subEventId
      console.log('Processing entries with subEventId...');

      // Delete tournament entries with invalid subEventId
      const orphanedTournamentSubEvents = await queryInterface.sequelize.query(
        `DELETE FROM event."Entries" 
         WHERE "entryType" = 'tournament' 
         AND "subEventId" IS NOT NULL 
         AND "subEventId" NOT IN (SELECT id FROM event."SubEventTournaments")`,
        { transaction },
      );

      console.log(
        `Deleted ${orphanedTournamentSubEvents[1].rowCount} orphaned tournament entries with invalid subEventId`,
      );

      // Delete competition entries with invalid subEventId
      const orphanedCompetitionSubEvents = await queryInterface.sequelize.query(
        `DELETE FROM event."Entries" 
         WHERE "entryType" = 'competition' 
         AND "subEventId" IS NOT NULL 
         AND "subEventId" NOT IN (SELECT id FROM event."SubEventCompetitions")`,
        { transaction },
      );

      console.log(
        `Deleted ${orphanedCompetitionSubEvents[1].rowCount} orphaned competition entries with invalid subEventId`,
      );

      const totalOrphanedSubEvents =
        orphanedTournamentSubEvents[1].rowCount + orphanedCompetitionSubEvents[1].rowCount;

      // Step 2: Find and delete orphaned entries with invalid drawId
      console.log('Processing entries with drawId...');

      // Delete tournament entries with invalid drawId
      const orphanedTournamentDraws = await queryInterface.sequelize.query(
        `DELETE FROM event."Entries" 
         WHERE "entryType" = 'tournament' 
         AND "drawId" IS NOT NULL 
         AND "drawId" NOT IN (SELECT id FROM event."DrawTournaments")`,
        { transaction },
      );

      console.log(
        `Deleted ${orphanedTournamentDraws[1].rowCount} orphaned tournament entries with invalid drawId`,
      );

      // Delete competition entries with invalid drawId
      const orphanedCompetitionDraws = await queryInterface.sequelize.query(
        `DELETE FROM event."Entries" 
         WHERE "entryType" = 'competition' 
         AND "drawId" IS NOT NULL 
         AND "drawId" NOT IN (SELECT id FROM event."DrawCompetitions")`,
        { transaction },
      );

      console.log(
        `Deleted ${orphanedCompetitionDraws[1].rowCount} orphaned competition entries with invalid drawId`,
      );

      const totalOrphanedDraws =
        orphanedTournamentDraws[1].rowCount + orphanedCompetitionDraws[1].rowCount;

      console.log(
        `Total orphaned entries cleaned up: ${totalOrphanedSubEvents + totalOrphanedDraws}`,
      );
      console.log('Note: No foreign key constraints added due to polymorphic relationship design');
      console.log('Application-level cascade deletion is handled in sync processors');
    });
  },

  down: async (queryInterface, Sequelize) => {
    // No constraints to remove since we didn't add any
    console.log('Cannot revert this migration');
  },
};
