'use strict';

const newClaims = [
  [
    '44d4f662-2544-426b-84f5-2d92adf61879',
    'edit-any:player',
    'Can edit any player',
    'player'
  ]
];

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      try {
        const dbNewClaims = await queryInterface.bulkInsert(
          { tableName: 'Claims', schema: 'security' },
          newClaims.map(claimName => {
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
      await queryInterface.bulkDelete(
        { tableName: 'Claims', schema: 'security' },
        { id: { [Op.in]: newClaims.map(claimName => claimName[0]) } },
        { transaction: t }
      );
    });
  }
};
