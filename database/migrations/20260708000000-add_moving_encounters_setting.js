"use strict";

const CLAIM_ID = "c3d4e5f6-7a8b-9c0d-1e2f-3a4b5c6d7e8f";
const SETTING_KEY = "movingEncounters";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // Seed the change-any:encounter global claim (used by adminChangeEncounterDate
        // and the movingEncounters setting permission check)
        await queryInterface.bulkInsert(
          { tableName: "Claims", schema: "security" },
          [
            {
              id: CLAIM_ID,
              name: "change-any:encounter",
              description: "Change any encounter date or rescheduling-window settings",
              category: "encounter",
              type: "global",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          { transaction: t, ignoreDuplicates: true }
        );

        // Seed the movingEncounters admin setting row
        await queryInterface.bulkInsert(
          { tableName: "Settings", schema: "system" },
          [
            {
              id: queryInterface.sequelize.constructor.literal("uuid_generate_v4()"),
              key: SETTING_KEY,
              description: "Encounter rescheduling open/close configuration",
              enabled: false,
              startDate: null,
              endDate: null,
              meta: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          { transaction: t, ignoreDuplicates: true }
        );
      } catch (err) {
        console.error("We errored with", err);
        await t.rollback();
        throw err;
      }
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.bulkDelete(
          { tableName: "Settings", schema: "system" },
          { key: SETTING_KEY },
          { transaction: t }
        );

        await queryInterface.bulkDelete(
          { tableName: "Claims", schema: "security" },
          { id: { [Sequelize.Op.in]: [CLAIM_ID] } },
          { transaction: t }
        );
      } catch (err) {
        console.error("We errored with", err);
        await t.rollback();
        throw err;
      }
    });
  },
};
