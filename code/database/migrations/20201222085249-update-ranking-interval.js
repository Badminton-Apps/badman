'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.renameColumn(
        {
          tableName: 'Systems',
          schema: 'ranking'
        },
        'intervalAmount',
        'updateIntervalAmount',
        { transaction: t }
      );

      await queryInterface.renameColumn(
        {
          tableName: 'Systems',
          schema: 'ranking'
        },
        'intervalUnit',
        'updateIntervalUnit',
        { transaction: t }
      );

      await queryInterface.addColumn(
        {
          tableName: 'Systems',
          schema: 'ranking'
        },
        'updateIntervalAmountLastUpdate',
        { type: sequelize.DATE, defaultValue: '2016-08-31T22:00:00.000Z' },
        { transaction: t }
      );

      await queryInterface.renameColumn(
        {
          tableName: 'Systems',
          schema: 'ranking'
        },
        'intervalCalcAmount',
        'periodAmount',
        { transaction: t }
      );

      await queryInterface.renameColumn(
        {
          tableName: 'Systems',
          schema: 'ranking'
        },
        'intervalCalcUnit',
        'periodUnit',
        { transaction: t }
      );

      await queryInterface.addColumn(
        {
          tableName: 'Systems',
          schema: 'ranking'
        },
        'caluclationIntervalAmount',
        { type: sequelize.INTEGER },
        { transaction: t }
      );
      await queryInterface.addColumn(
        {
          tableName: 'Systems',
          schema: 'ranking'
        },
        'calculationIntervalUnit',
        { type: sequelize.ENUM('months', 'weeks', 'days') },
        { transaction: t }
      );

      await queryInterface.addColumn(
        {
          tableName: 'Systems',
          schema: 'ranking'
        },
        'caluclationIntervalLastUpdate',
        { type: sequelize.DATE, defaultValue: '2016-08-31T22:00:00.000Z' },
        { transaction: t }
      );
      await queryInterface.addColumn(
        {
          tableName: 'Places',
          schema: 'ranking'
        },
        'updatePossible',
        { type: sequelize.BOOLEAN },
        { transaction: t }
      );
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.renameColumn(
        {
          tableName: 'Systems',
          schema: 'ranking'
        },
        'updateIntervalAmount',
        'intervalAmount',
        { transaction: t }
      );

      await queryInterface.renameColumn(
        {
          tableName: 'Systems',
          schema: 'ranking'
        },
        'updateIntervalUnit',
        'intervalUnit',
        { transaction: t }
      );
      await queryInterface.removeColumn(
        {
          tableName: 'Systems',
          schema: 'ranking'
        },
        'caluclationIntervalLastUpdate',
        { transaction: t }
      );

      await queryInterface.renameColumn(
        {
          tableName: 'Systems',
          schema: 'ranking'
        },
        'periodAmount',
        'intervalCalcAmount',
        { transaction: t }
      );

      await queryInterface.renameColumn(
        {
          tableName: 'Systems',
          schema: 'ranking'
        },
        'periodUnit',
        'intervalCalcUnit',
        { transaction: t }
      );

      await queryInterface.removeColumn(
        {
          tableName: 'Systems',
          schema: 'ranking'
        },
        'updateIntervalAmountLastUpdate',
        { transaction: t }
      );
      await queryInterface.removeColumn(
        {
          tableName: 'Places',
          schema: 'ranking'
        },
        'updatePossible',
        { transaction: t }
      );

      await queryInterface.removeColumn(
        {
          tableName: 'Systems',
          schema: 'ranking'
        },
        'calculationIntervalUnit',
        { transaction: t }
      );

      await queryInterface.removeColumn(
        {
          tableName: 'Systems',
          schema: 'ranking'
        },
        'caluclationIntervalAmount',
        { transaction: t }
      );
      
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS import."enum_Systems_calculationIntervalUnit";', {
        transaction: t,
      });
      
    });
  }
};
