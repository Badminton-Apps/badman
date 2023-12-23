/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.renameColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'caluclationIntervalLastUpdate',
          'calculationIntervalLastUpdate',
          { transaction: t },
        );

        await queryInterface.renameColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'caluclationIntervalAmount',
          'calculationIntervalAmount',
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
        await queryInterface.renameColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'calculationIntervalLastUpdate',
          'caluclationIntervalLastUpdate',
          { transaction: t },
        );

        await queryInterface.renameColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'calculationIntervalAmount',
          'caluclationIntervalAmount',
          { transaction: t },
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
