/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.changeColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'differenceForDowngradeSingle',
          {
            type: sequelize.DataTypes.DECIMAL(10, 2),
            allowNull: true,
          },
          { transaction: t },
        );
        await queryInterface.changeColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'differenceForDowngradeDouble',
          {
            type: sequelize.DataTypes.DECIMAL(10, 2),
            allowNull: true,
          },
          { transaction: t },
        );
        await queryInterface.changeColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'differenceForDowngradeMix',
          {
            type: sequelize.DataTypes.DECIMAL(10, 2),
            allowNull: true,
          },
          { transaction: t },
        );
        await queryInterface.changeColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'differenceForUpgradeSingle',
          {
            type: sequelize.DataTypes.DECIMAL(10, 2),
            allowNull: true,
          },
          { transaction: t },
        );
        await queryInterface.changeColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'differenceForUpgradeDouble',
          {
            type: sequelize.DataTypes.DECIMAL(10, 2),
            allowNull: true,
          },
          { transaction: t },
        );
        await queryInterface.changeColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'differenceForUpgradeMix',
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
          'differenceForDowngradeSingle',
          {
            type: sequelize.DataTypes.INTEGER,
            allowNull: true,
          },
          { transaction: t },
        );
        await queryInterface.changeColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'differenceForDowngradeDouble',
          {
            type: sequelize.DataTypes.INTEGER,
            allowNull: true,
          },
          { transaction: t },
        );
        await queryInterface.changeColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'differenceForDowngradeMix',
          {
            type: sequelize.DataTypes.INTEGER,
            allowNull: true,
          },
          { transaction: t },
        );
        await queryInterface.changeColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'differenceForUpgradeSingle',
          {
            type: sequelize.DataTypes.INTEGER,
            allowNull: true,
          },
          { transaction: t },
        );
        await queryInterface.changeColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'differenceForUpgradeDouble',
          {
            type: sequelize.DataTypes.INTEGER,
            allowNull: true,
          },
          { transaction: t },
        );
        await queryInterface.changeColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'differenceForUpgradeMix',
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
