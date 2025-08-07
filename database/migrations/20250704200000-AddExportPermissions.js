"use strict";

const claims = [
  {
    id: "e4f8c2a3-9e8d-4d93-8d2f-1e3b4c5d6e8a",
    name: "export-teams:competition",
    description: "Export teams data for competition",
    category: "competitions",
    type: "global",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "f5a9d3b4-0f9e-4e94-9e3a-2f4c5d6e7f9b",
    name: "export-exceptions:competition",
    description: "Export exceptions data for competition",
    category: "competitions",
    type: "global",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface) => {
    try {
      // Check if claims already exist (without transaction to avoid aborted transaction issues)
      const existingClaims = await queryInterface.sequelize.query(
        `SELECT name FROM "security"."Claims" WHERE name IN ('export-teams:competition', 'export-exceptions:competition')`,
        {
          type: queryInterface.sequelize.QueryTypes.SELECT,
        }
      );

      const existingClaimNames = existingClaims.map((claim) => claim.name);
      const claimsToInsert = claims.filter((claim) => !existingClaimNames.includes(claim.name));

      if (claimsToInsert.length > 0) {
        // Add the new export permissions only if they don't exist
        await queryInterface.bulkInsert(
          {
            tableName: "Claims",
            schema: "security",
          },
          claimsToInsert
        );
        console.log(`Added ${claimsToInsert.length} new export permissions`);
      } else {
        console.log("Export permissions already exist, skipping insertion");
      }
    } catch (err) {
      console.error("Error adding export permissions:", err);
      throw err;
    }
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // Remove the new export permissions
        await queryInterface.bulkDelete(
          {
            tableName: "Claims",
            schema: "security",
          },
          {
            id: {
              [Sequelize.Op.in]: claims.map((claim) => claim.id),
            },
          },
          {
            transaction: t,
          }
        );
      } catch (err) {
        console.error("We errored with", err);
        t.rollback();
      }
    });
  },
};
