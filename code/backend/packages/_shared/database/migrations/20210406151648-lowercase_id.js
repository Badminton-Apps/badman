'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.renameColumn(
        {
          tableName: 'RequestLinks',
          schema: 'public'
        },
        'PlayerId',
        'playerId',
        { transaction: t }
      );
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.renameColumn(
        {
          tableName: 'RequestLinks',
          schema: 'public'
        },
        'playerId',
        'PlayerId',
        { transaction: t }
      );
    });
  }
};
