/* eslint-disable @typescript-eslint/no-var-requires */
"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.bulkInsert(
          {
            tableName: "Claims",
            schema: "security",
          },
          [
            {
              name: "change:rules",
              description: "Allow chaning ruless",
              category: "rules",
              type: "global",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          { transaction: t }
        );

        // create Rule table
        await queryInterface.createTable(
          {
            tableName: "Rules",
            schema: "system",
          },
          {
            id: {
              type: Sequelize.UUID,
              defaultValue: Sequelize.UUIDV4,
              primaryKey: true,
            },
            name: {
              type: Sequelize.STRING,
              allowNull: false,
            },
            group: {
              type: Sequelize.STRING,
              allowNull: false,
            },
            description: {
              type: Sequelize.STRING,
              allowNull: true,
            },
            meta: {
              type: Sequelize.JSON,
              allowNull: true,
            },
            activated: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
            },
            createdAt: {
              type: Sequelize.DATE,
              allowNull: false,
            },
            updatedAt: {
              type: Sequelize.DATE,
              allowNull: false,
            },
          },
          { transaction: t }
        );
      } catch (err) {
        console.error("We errored with", err?.message ?? err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // remove enlist-any-event:team claim
        await queryInterface.sequelize.query(
          `DELETE FROM "security"."Claims" WHERE name = 'change:rules'`,
          { transaction: t }
        );

        // drop Rule table
        await queryInterface.dropTable(
          {
            tableName: "Rules",
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
