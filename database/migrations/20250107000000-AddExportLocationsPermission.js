'use strict';

const claims = [
  {
    id: 'a6b7c8d9-1e2f-4a5b-9c6d-3e4f5a6b7c8d',
    name: 'export-locations:competition',
    description: 'Export locations data for competition',
    category: 'competitions',
    type: 'global',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface) => {
    try {
      // Check if claim already exists (without transaction to avoid aborted transaction issues)
      const existingClaims = await queryInterface.sequelize.query(
        `SELECT name FROM "security"."Claims" WHERE name = 'export-locations:competition'`,
        { 
          type: queryInterface.sequelize.QueryTypes.SELECT
        }
      );

      if (existingClaims.length === 0) {
        // Add the new export-locations permission only if it doesn't exist
        await queryInterface.bulkInsert(
          {
            tableName: 'Claims',
            schema: 'security',
          },
          claims
        );
        console.log('Added export-locations:competition permission');
      } else {
        console.log('Export-locations permission already exists, skipping insertion');
      }
    } catch (err) {
      console.error('Error adding export-locations permission:', err);
      throw err;
    }
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // Remove the export-locations permission
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
        console.log('Removed export-locations:competition permission');
      } catch (err) {
        console.error('Error removing export-locations permission:', err);
        t.rollback();
      }
    });
  },
};
