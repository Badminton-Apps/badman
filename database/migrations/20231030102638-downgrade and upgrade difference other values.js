/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.addColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'differenceForDowngradeSingle',
          {
            type: sequelize.DataTypes.INTEGER,
            allowNull: true,
          },
          { transaction: t },
        );
        await queryInterface.addColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'differenceForDowngradeDouble',
          {
            type: sequelize.DataTypes.INTEGER,
            allowNull: true,
          },
          { transaction: t },
        );
        await queryInterface.addColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'differenceForDowngradeMix',
          {
            type: sequelize.DataTypes.INTEGER,
            allowNull: true,
          },
          { transaction: t },
        );
        await queryInterface.addColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'differenceForUpgradeSingle',
          {
            type: sequelize.DataTypes.INTEGER,
            allowNull: true,
          },
          { transaction: t },
        );
        await queryInterface.addColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'differenceForUpgradeDouble',
          {
            type: sequelize.DataTypes.INTEGER,
            allowNull: true,
          },
          { transaction: t },
        );
        await queryInterface.addColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'differenceForUpgradeMix',
          {
            type: sequelize.DataTypes.INTEGER,
            allowNull: true,
          },
          { transaction: t },
        );

        const [rankingSystems] = await queryInterface.sequelize.query(
          'SELECT * FROM "ranking"."RankingSystems"',
          { transaction: t },
        );

        for (const rankingSystem of rankingSystems) {
          await queryInterface.sequelize.query(
            `UPDATE "ranking"."RankingSystems" SET
              "differenceForDowngradeSingle" = ${rankingSystem.differenceForDowngrade},
              "differenceForDowngradeDouble" = ${rankingSystem.differenceForDowngrade},
              "differenceForDowngradeMix" = ${rankingSystem.differenceForDowngrade},
              "differenceForUpgradeSingle" = ${rankingSystem.differenceForUpgrade},
              "differenceForUpgradeDouble" = ${rankingSystem.differenceForUpgrade},
              "differenceForUpgradeMix" = ${rankingSystem.differenceForUpgrade}
            WHERE id = '${rankingSystem.id}'`,
            { transaction: t },
          );
        }

        await queryInterface.removeColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'differenceForDowngrade',
          { transaction: t },
        );
        await queryInterface.removeColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'differenceForUpgrade',
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
        await queryInterface.addColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'differenceForDowngrade',
          {
            type: sequelize.DataTypes.INTEGER,
            allowNull: true,
          },
          { transaction: t },
        );
        await queryInterface.addColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'differenceForUpgrade',
          {
            type: sequelize.DataTypes.INTEGER,
            allowNull: true,
          },
          { transaction: t },
        );

        const [rankingSystems] = await queryInterface.sequelize.query(
          'SELECT * FROM "ranking"."RankingSystems"',
          { transaction: t },
        );

        for (const rankingSystem of rankingSystems) {
          await queryInterface.sequelize.query(
            `UPDATE "ranking"."RankingSystems" SET
              "differenceForDowngrade" = ${rankingSystem.differenceForDowngradeSingle},
              "differenceForUpgrade" = ${rankingSystem.differenceForUpgradeSingle}
            WHERE id = '${rankingSystem.id}'`,
            { transaction: t },
          );
        }

        await queryInterface.removeColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'differenceForDowngradeSingle',
          { transaction: t },
        );
        await queryInterface.removeColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'differenceForDowngradeDouble',
          { transaction: t },
        );
        await queryInterface.removeColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'differenceForDowngradeMix',
          { transaction: t },
        );
        await queryInterface.removeColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'differenceForUpgradeSingle',
          { transaction: t },
        );
        await queryInterface.removeColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'differenceForUpgradeDouble',
          { transaction: t },
        );
        await queryInterface.removeColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'differenceForUpgradeMix',
          { transaction: t },
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
