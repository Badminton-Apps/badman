"use strict";

const claims = [
  {
    id: "b2c3d4e5-6f7a-8b9c-0d1e-2f3a4b5c6d7e",
    name: "edit:system-settings",
    description: "Edit system settings",
    category: "system",
    type: "global",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.bulkInsert(
        { tableName: "Claims", schema: "security" },
        claims,
        { transaction: t }
      );
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.bulkDelete(
        { tableName: "Claims", schema: "security" },
        { id: { [Sequelize.Op.in]: claims.map((c) => c.id) } },
        { transaction: t }
      );
    });
  },
};
