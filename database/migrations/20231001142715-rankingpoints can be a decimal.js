/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.changeColumn(
          {
            schema: 'ranking',
            tableName: 'RankingPoints',
          },
          'differenceInLevel',
          {
            type: sequelize.DataTypes.DECIMAL(10, 2),
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
        await queryInterface.changeColumn(
          {
            schema: 'ranking',
            tableName: 'RankingPoints',
          },
          'differenceInLevel',
          {
            type: sequelize.DataTypes.INTEGER,
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
