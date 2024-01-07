/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.addColumn(
          {
            tableName: 'CronJobs',
            schema: 'system',
          },
          'amount',
          {
            type: sequelize.DataTypes.INTEGER,
            defaultValue: 0,
            allowNull: false,
          },
          { transaction: t },
        );

        await queryInterface.removeColumn(
          {
            tableName: 'CronJobs',
            schema: 'system',
          },
          'running',
          { transaction: t },
        );
      } catch (err) {
        console.error('We errored with', err?.message ?? err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.removeColumn(
          {
            tableName: 'CronJobs',
            schema: 'system',
          },
          'amount',
          { transaction: t },
        );

        await queryInterface.addColumn(
          {
            tableName: 'CronJobs',
            schema: 'system',
          },
          'running',
          {
            type: sequelize.DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false,
          },
          { transaction: t },
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
