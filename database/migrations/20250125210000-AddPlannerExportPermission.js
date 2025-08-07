"use strict";

const claims = [
  {
    id: "b8f1c2a3-8e7d-4c93-9d2f-1e3b4c5d6e7f",
    name: "export-planner:competition",
    description: "Export planner data for competition",
    category: "competitions",
    type: "global",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // Add the new export permission
        await queryInterface.bulkInsert(
          {
            tableName: "Claims",
            schema: "security",
          },
          claims,
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
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // Remove the new export permission
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
