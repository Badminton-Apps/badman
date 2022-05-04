'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.addColumn(
        {
          tableName: 'RequestLinks',
          schema: 'public'
        },
        'sub',
        {
          type: sequelize.DataTypes.STRING
        },
        { transaction: t }
      );
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeColumn(
        {
          tableName: 'RequestLinks',
          schema: 'public'
        },
        'sub',
        { transaction: t }
      );
    });
  }
};
