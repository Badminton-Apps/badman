'use strict';

const { Op } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      console.log('Starting cleanup of orphaned EventEntry records...');

      // Find all EventEntries with non-null subEventId
      const entriesWithSubEventId = await queryInterface.sequelize.query(
        `SELECT id, "subEventId", "entryType" FROM event."Entries" WHERE "subEventId" IS NOT NULL`,
        { transaction, type: Sequelize.QueryTypes.SELECT },
      );

      console.log(`Found ${entriesWithSubEventId.length} entries with subEventId`);

      let orphanedSubEventCount = 0;

      for (const entry of entriesWithSubEventId) {
        let isValid = false;

        if (entry.entryType === 'tournament') {
          // Check if subEventId exists in SubEventTournaments
          const subEvent = await queryInterface.sequelize.query(
            `SELECT id FROM event."SubEventTournaments" WHERE id = :subEventId`,
            {
              transaction,
              type: Sequelize.QueryTypes.SELECT,
              replacements: { subEventId: entry.subEventId },
            },
          );
          isValid = subEvent.length > 0;
        } else if (entry.entryType === 'competition') {
          // Check if subEventId exists in SubEventCompetitions
          const subEvent = await queryInterface.sequelize.query(
            `SELECT id FROM event."SubEventCompetitions" WHERE id = :subEventId`,
            {
              transaction,
              type: Sequelize.QueryTypes.SELECT,
              replacements: { subEventId: entry.subEventId },
            },
          );
          isValid = subEvent.length > 0;
        }

        if (!isValid) {
          console.log(`Deleting orphaned entry ${entry.id} with subEventId ${entry.subEventId}`);
          await queryInterface.sequelize.query(`DELETE FROM event."Entries" WHERE id = :entryId`, {
            transaction,
            replacements: { entryId: entry.id },
          });
          orphanedSubEventCount++;
        }
      }

      console.log(
        `Successfully cleaned up ${orphanedSubEventCount} orphaned entries with invalid subEventId`,
      );

      // Find all EventEntries with non-null drawId
      const entriesWithDrawId = await queryInterface.sequelize.query(
        `SELECT id, "drawId", "entryType" FROM event."Entries" WHERE "drawId" IS NOT NULL`,
        { transaction, type: Sequelize.QueryTypes.SELECT },
      );

      console.log(`Found ${entriesWithDrawId.length} entries with drawId`);

      let orphanedDrawCount = 0;

      for (const entry of entriesWithDrawId) {
        let isValid = false;

        if (entry.entryType === 'tournament') {
          // Check if drawId exists in DrawTournaments
          const draw = await queryInterface.sequelize.query(
            `SELECT id FROM event."DrawTournaments" WHERE id = :drawId`,
            {
              transaction,
              type: Sequelize.QueryTypes.SELECT,
              replacements: { drawId: entry.drawId },
            },
          );
          isValid = draw.length > 0;
        } else if (entry.entryType === 'competition') {
          // Check if drawId exists in DrawCompetitions
          const draw = await queryInterface.sequelize.query(
            `SELECT id FROM event."DrawCompetitions" WHERE id = :drawId`,
            {
              transaction,
              type: Sequelize.QueryTypes.SELECT,
              replacements: { drawId: entry.drawId },
            },
          );
          isValid = draw.length > 0;
        }

        if (!isValid) {
          console.log(`Deleting orphaned entry ${entry.id} with drawId ${entry.drawId}`);
          await queryInterface.sequelize.query(`DELETE FROM event."Entries" WHERE id = :entryId`, {
            transaction,
            replacements: { entryId: entry.id },
          });
          orphanedDrawCount++;
        }
      }

      console.log(
        `Successfully cleaned up ${orphanedDrawCount} orphaned entries with invalid drawId`,
      );
      console.log(
        `Total orphaned entries cleaned up: ${orphanedSubEventCount + orphanedDrawCount}`,
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
