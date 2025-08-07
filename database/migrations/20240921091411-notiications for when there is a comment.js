/* eslint-disable @typescript-eslint/no-var-requires */
"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.addColumn(
          {
            tableName: "Settings",
            schema: "personal",
          },
          "encounterHasCommentNotification",
          {
            type: sequelize.DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 2,
          },
          { transaction: t }
        );

        await queryInterface.addColumn(
          {
            tableName: "EventCompetitions",
            schema: "event",
          },
          "contactId",
          {
            type: sequelize.DataTypes.UUID,
            allowNull: true,
            references: {
              model: {
                tableName: "Players",
                schema: "public",
              },
              key: "id",
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
        await queryInterface.removeColumn(
          {
            tableName: "Settings",
            schema: "personal",
          },
          "encounterHasCommentNotification",
          { transaction: t }
        );

        await queryInterface.removeColumn(
          {
            tableName: "EventCompetitions",
            schema: "event",
          },
          "contactId",
          { transaction: t }
        );
      } catch (err) {
        console.error("We errored with", err);
        t.rollback();
      }
    });
  },
};
