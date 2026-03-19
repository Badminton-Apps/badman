"use strict";

const claims = [
  {
    id: "a1b2c3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    name: "change:enrollment",
    description: "Change enrollment settings",
    category: "enrollment",
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
        await queryInterface.createTable(
          {
            tableName: "EnrollmentSettings",
            schema: "system",
          },
          {
            id: {
              type: queryInterface.sequelize.constructor.DataTypes.UUID,
              primaryKey: true,
              allowNull: false,
              defaultValue:
                queryInterface.sequelize.constructor.literal("uuid_generate_v4()"),
            },
            enrollmentOpen: {
              type: queryInterface.sequelize.constructor.DataTypes.BOOLEAN,
              allowNull: false,
              defaultValue: false,
            },
            openDate: {
              type: queryInterface.sequelize.constructor.DataTypes.DATEONLY,
              allowNull: true,
            },
            closeDate: {
              type: queryInterface.sequelize.constructor.DataTypes.DATEONLY,
              allowNull: true,
            },
            createdAt: {
              type: queryInterface.sequelize.constructor.DataTypes.DATE,
              allowNull: false,
              defaultValue: queryInterface.sequelize.constructor.literal("NOW()"),
            },
            updatedAt: {
              type: queryInterface.sequelize.constructor.DataTypes.DATE,
              allowNull: false,
              defaultValue: queryInterface.sequelize.constructor.literal("NOW()"),
            },
          },
          { transaction: t }
        );

        // Seed default row
        await queryInterface.bulkInsert(
          {
            tableName: "EnrollmentSettings",
            schema: "system",
          },
          [
            {
              id: queryInterface.sequelize.constructor.literal("uuid_generate_v4()"),
              enrollmentOpen: false,
              openDate: null,
              closeDate: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          { transaction: t }
        );

        // Add claim
        await queryInterface.bulkInsert(
          {
            tableName: "Claims",
            schema: "security",
          },
          claims,
          { transaction: t }
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
        // Remove claim
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
          { transaction: t }
        );

        // Drop table
        await queryInterface.dropTable(
          {
            tableName: "EnrollmentSettings",
            schema: "system",
          },
          { transaction: t }
        );
      } catch (err) {
        console.error("We errored with", err);
        t.rollback();
      }
    });
  },
};
