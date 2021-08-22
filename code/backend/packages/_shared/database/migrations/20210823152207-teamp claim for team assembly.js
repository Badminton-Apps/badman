'use strict';
const newAdminClaims = [
  [
    'c4f4407d-e7e7-4090-be45-4480c6c46dc5',
    'assembly:team',
    'Create an assembly',
    'competition'
  ]
];
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      try {
        const dbAdminClaims = await queryInterface.bulkInsert(
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
