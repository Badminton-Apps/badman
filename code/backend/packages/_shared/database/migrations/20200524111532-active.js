'use strict';

module.exports = {
  up: (queryInterface, sequelize) => {
    return queryInterface.addColumn(
      {
        tableName: 'ClubMemberships',
        schema: 'public'
      },
      'active',
      {
        type: sequelize.DataTypes.BOOLEAN,
        defaultValue: true
      }
    );
  },

  down: (queryInterface, sequelize) => {
    return queryInterface.removeColumn(
      {
        tableName: 'ClubMemberships',
        schema: 'public'
      },
      'active'
    );
  }
};
