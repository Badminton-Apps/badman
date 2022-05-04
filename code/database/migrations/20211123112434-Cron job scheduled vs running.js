'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.addColumn(
        {
          tableName: 'Crons',
          schema: 'job'
        },
        'scheduled',
        { type: sequelize.DataTypes.STRING },
        { transaction: t }
      );
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeColumn(
        {
          tableName: 'Crons',
          schema: 'job'
        },
        'scheduled',
        { transaction: t }
      );
    });
  }
};
