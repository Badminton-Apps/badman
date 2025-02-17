'use strict';

const claims = [
  {
    id: '0b44bd14-0755-4702-b3bc-a5b3aa3699c9',
    name: 'sync:tournament',
    description: 'Sync tournaments',
    category: 'tournaments',
    type: 'global',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'c531b9e3-35dd-42f3-8493-bd5bb8806e43',
    name: 'sync:competition',
    description: 'Sync competitions',
    category: 'competitions',
    type: 'global',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // Add 2 claims to the database
        await queryInterface.bulkInsert(
          {
            tableName: 'Claims',
            schema: 'security',
          },
          claims,
          {
            transaction: t,
          },
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // Remove 2 claims from the database
        await queryInterface.bulkDelete(
          {
            tableName: 'Claims',
            schema: 'security',
          },
          {
            id: {
              [Sequelize.Op.in]: claims.map((claim) => claim.id),
            },
          },
          {
            transaction: t,
          },
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
