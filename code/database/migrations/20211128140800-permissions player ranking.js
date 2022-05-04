'use strict';

const newAdminClaims = [
  [
    '52f04e67-8859-4425-9243-39012b2f3a8c',
    'edit:ranking',
    'Can change ranking of player',
    'player',
  ],
  [
    'b39ac933-ec02-4855-b224-6c18cb6dfe69',
    'subscription:player',
    'Can change the subscription (login) of player',
    'player',
  ],
  [
    'eeeebb91-3cd7-43d4-9a6a-1be077849c84',
    'membership:club',
    'Can change the club membership of a player',
    'player',
  ],
];

module.exports = {
  up: async (queryInterface, sequelize) => {
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

        await queryInterface.bulkUpdate(
          { tableName: 'Claims', schema: 'security' },
          { name: 'status:competition' }, // update
          {
            name: 'competition-status:player',
          }, // where
          {
            transaction: t,
          }
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.bulkDelete(
          { tableName: 'Claims', schema: 'security' },
          { id: { [Op.in]: newAdminClaims.map((claimName) => claimName[0]) } },
          { transaction: t }
        );

        await queryInterface.bulkUpdate(
          { tableName: 'Claims', schema: 'security' },
          {
            name: 'competition-status:player', // update
          },
          { name: 'status:competition' }, // where
          {
            transaction: t,
          }
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
