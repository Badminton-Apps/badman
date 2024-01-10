/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.addColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'calculationDayOfWeek',
          {
            type: sequelize.DataTypes.INTEGER,
            defaultValue: 1,
            allowNull: false,
          },
          { transaction: t },
        );

        await queryInterface.addColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'updateDayOfWeek',
          {
            type: sequelize.DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
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
        await queryInterface.removeColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'calculationDayOfWeek',
          { transaction: t },
        );
        await queryInterface.removeColumn(
          { tableName: 'RankingSystems', schema: 'ranking' },
          'updateDayOfWeek',
          { transaction: t },
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
