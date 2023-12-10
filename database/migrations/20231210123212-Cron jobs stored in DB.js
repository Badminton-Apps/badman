/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.createTable(
          {
            tableName: 'CronJobs',
            schema: 'system',
          },
          {
            id: {
              primaryKey: true,
              type: sequelize.UUID,
              allowNull: false,
              defaultValue: sequelize.fn('uuid_generate_v4'),
            },
            name: {
              type: sequelize.DataTypes.STRING,
              allowNull: false,
            },
            cronTime: {
              type: sequelize.DataTypes.STRING,
              allowNull: false,
            },
            meta: {
              type: sequelize.DataTypes.JSON,
              allowNull: true,
            },
            lastRun: {
              type: sequelize.DataTypes.DATE,
              allowNull: true,
            },
            createdAt: {
              type: sequelize.DataTypes.DATE,
              allowNull: false,
              defaultValue: sequelize.fn('NOW'),
            },
            updatedAt: {
              type: sequelize.DataTypes.DATE,
              allowNull: false,
              defaultValue: sequelize.fn('NOW'),
            },
          },
          { transaction: t },
        );
      } catch (err) {
        console.error('We errored with', err?.message ?? err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.dropTable({
          tableName: 'CronJobs',
          schema: 'system',
        });
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
