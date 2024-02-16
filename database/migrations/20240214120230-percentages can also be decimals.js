/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.changeColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'procentWinning',
          {
            type: sequelize.DataTypes.DECIMAL(10, 2),
            allowNull: true,
          },
          { transaction: t },
        );
        await queryInterface.changeColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'procentWinningPlus1',
          {
            type: sequelize.DataTypes.DECIMAL(10, 2),
            allowNull: true,
          },
          { transaction: t },
        );
        await queryInterface.changeColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'procentLosing',
          {
            type: sequelize.DataTypes.DECIMAL(10, 2),
            allowNull: true,
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
          { tableName: 'RankingSystems', schema: 'ranking' },
          'procentWinning',
          {
            type: sequelize.DataTypes.INTEGER,
            allowNull: true,
          },
          { transaction: t },
        );
        await queryInterface.changeColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'procentWinningPlus1',
          {
            type: sequelize.DataTypes.INTEGER,
            allowNull: true,
          },
          { transaction: t },
        );
        await queryInterface.changeColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'procentLosing',
          {
            type: sequelize.DataTypes.INTEGER,
            allowNull: true,
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
