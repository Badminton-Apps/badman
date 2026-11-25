"use strict";

/** @type {import('sequelize-cli').Migration} */

module.exports = {
  async up(queryInterface, _Sequelize) {
    return queryInterface.sequelize.transaction(async (t) => {
      // Backfill status = 'PENDING' for all EncounterChangeDates rows that still
      // have a NULL status. These are dates from open (non-finalized) change requests
      // that the previous migration intentionally left NULL as "historical/no longer relevant",
      // but the GraphQL schema declares status as non-nullable (String!) so NULL causes
      // "Cannot return null for non-nullable field EncounterChangeDate.status".
      await queryInterface.sequelize.query(
        `UPDATE event."EncounterChangeDates"
         SET "status" = 'PENDING'::event."enum_EncounterChangeDates_status"
         WHERE "status" IS NULL`,
        { transaction: t }
      );
    });
  },

  async down(queryInterface, _Sequelize) {
    // No safe rollback — we cannot distinguish rows that were genuinely PENDING
    // from rows that were NULL before this migration ran.
  },
};
