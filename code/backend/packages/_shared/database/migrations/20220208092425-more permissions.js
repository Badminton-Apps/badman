/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const { Op } = require('sequelize');

const newAdminClaims = [
  [
    '618d6c1e-e9cd-460c-8956-eecee786e8e7',
    'details-any:player',
    'Can view (GPDR) details of any player',
    'player',
  ]
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
