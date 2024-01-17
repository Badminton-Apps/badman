/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.renameColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'updateIntervalAmountLastUpdate',
          'updateLastUpdate',
          { transaction: t },
        );

        await queryInterface.renameColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'calculationIntervalLastUpdate',
          'calculationLastUpdate',
          { transaction: t },
        );

        await queryInterface.removeColumn({ tableName: 'RankingSystems', schema: 'ranking' }, 'runDate', {
          transaction: t,
        });
      } catch (err) {
        console.error('We errored with', err?.message ?? err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.renameColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'updateLastUpdate',
          'updateIntervalAmountLastUpdate',
          { transaction: t },
        );

        await queryInterface.renameColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'calculationLastUpdate',
          'calculationIntervalLastUpdate',
          { transaction: t },
        );

        await queryInterface.addColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'runDate',
          {
            type: sequelize.DataTypes.DATE,
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
