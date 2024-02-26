/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.dropSchema('job', { transaction: t });
      } catch (err) {
        console.error('We errored with', err?.message ?? err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.createSchema('job', { transaction: t });
        await queryInterface.createTable(
          {
            tableName: 'Crons',
            schema: 'job',
          },
          {
            id: {
              type: sequelize.DataTypes.STRING,
              primaryKey: true,
            },
            cron: sequelize.DataTypes.STRING,
            type: sequelize.DataTypes.STRING,
            running: sequelize.DataTypes.BOOLEAN,
            lastRun: sequelize.DataTypes.DATE,
            meta: sequelize.DataTypes.JSON,
            createdAt: sequelize.DataTypes.DATE,
            updatedAt: sequelize.DataTypes.DATE,
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
