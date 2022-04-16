/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const { Op } = require('sequelize');

const newAdminClaims = [
  [
    '23c105bd-afb5-4fc4-abd4-cc4dd87948cb',
    'enlist-any:team',
    'Enlist any team in to competitoin',
    'team'
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
