'use strict';

const newAdminClaims = [
  [
    '94f021ed-a3ff-4f07-808f-b6c8abe19288',
    'merge:player',
    'Can merge players',
    'player'
  ],
  [
    'd07482ba-01e4-4aff-8111-8ea14f570273',
    'delete:player',
    'Can delete players',
    'player'
  ]
];

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      try {
        await queryInterface.bulkInsert(
          { tableName: 'Claims', schema: 'security' },
          newAdminClaims.map(claimName => {
            return {
              id: claimName[0],
              name: claimName[1],
              description: claimName[2],
              category: claimName[3],
              updatedAt: new Date(),
              createdAt: new Date(),
              type: 'global'
            };
          }),
          {
            transaction: t,
            ignoreDuplicates: true,
            returning: ['id']
          }
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      try {
        await queryInterface.bulkDelete(
          { tableName: 'Claims', schema: 'security' },
          { id: { [Op.in]: newAdminClaims.map(claimName => claimName[0]) } },
          { transaction: t }
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  }
};
