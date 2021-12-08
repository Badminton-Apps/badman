/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const { Op } = require('sequelize');

const newAdminClaims = [
  [
    'b8c832a1-6f6f-406b-bd34-95f84efaa4a5',
    'add:event',
    'Add subevent(s) to ranking group',
    'ranking-group',
  ],
  [
    '31f4cf1e-988f-496c-a694-7c9b846c7c57',
    'remove:event',
    'Remove subevent(s) to ranking group',
    'ranking-group',
  ],
];

module.exports = {
  up: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.bulkInsert(
          { tableName: 'Claims', schema: 'security' },
          newAdminClaims.map((claimName) => {
            return {
              id: claimName[0],
              name: claimName[1],
              description: claimName[2],
              category: claimName[3],
              updatedAt: new Date(),
              createdAt: new Date(),
              type: 'global',
            };
          }),
          {
            transaction: t,
            ignoreDuplicates: true,
            returning: ['id'],
          }
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.bulkDelete(
          { tableName: 'Claims', schema: 'security' },
          { id: { [Op.in]: newAdminClaims.map((claimName) => claimName[0]) } },
          { transaction: t }
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
