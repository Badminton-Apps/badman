/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const { type } = require('node:os');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.bulkInsert(
          {
            tableName: 'Claims',
            schema: 'security',
          },
          [
            {
              name: 'change:transfer',
              description: 'Allow accepting transfers',
              category: 'transfer',
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

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        
        // remove enlist-any-event:team claim
        await queryInterface.sequelize.query(
          `DELETE FROM "security"."Claims" WHERE name = 'change:transfer'`,
          { transaction: t },
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
