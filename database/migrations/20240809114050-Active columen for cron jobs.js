/* eslint-disable @typescript-eslint/no-var-requires */
"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // add column active to system.cronjobs
        await queryInterface.addColumn(
          {
            schema: "system",
            tableName: "CronJobs",
          },
          "active",
          {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
            allowNull: false,
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
            schema: "system",
            tableName: "CronJobs",
          },
          "active",
          { transaction: t }
        );
      } catch (err) {
        console.error("We errored with", err);
        t.rollback();
      }
    });
  },
};
