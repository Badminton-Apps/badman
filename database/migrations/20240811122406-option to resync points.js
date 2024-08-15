/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.bulkInsert(
          {
            tableName: 'Claims',
            schema: 'security',
          },
          [
            {
              name: 're-sync:points',
              description: 'Allow re-syncing points',
              category: 'points',
              type: 'global',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          { transaction: t },
        );
      } catch (err) {
        console.error('We errored with', err?.message ?? err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // remove enlist-any-event:team claim
        await queryInterface.sequelize.query(
          `DELETE FROM "security"."Claims" WHERE name = 're-sync:points'`,
          { transaction: t },
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
