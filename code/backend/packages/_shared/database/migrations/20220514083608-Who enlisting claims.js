/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';
const { Op } = require('sequelize');

const newAdminClaims = [
  [
    '6f452541-9f9d-4d0b-8232-e6f416f58c45',
    'view:entries',
    'Can view the entries',
    'competition',
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
              type: 'GLOBAL',
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
          {
            id: {
              [Op.in]: [personal, team, ...newAdminClaims].map(
                (claimName) => claimName[0]
              ),
            },
          },
          { transaction: t }
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
