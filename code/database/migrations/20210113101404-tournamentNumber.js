'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.addColumn(
      {
        tableName: 'Files',
        schema: 'import'
      },
      'toernamentNumber',
      {
        type: sequelize.DataTypes.STRING
      }
    );
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.removeColumn(
      {
        tableName: 'Files',
        schema: 'import'
      },
      'toernamentNumber'
    );
  }
};
