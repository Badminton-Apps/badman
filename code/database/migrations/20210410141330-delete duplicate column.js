'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeColumn(
        {
          tableName: 'Teams',
          schema: 'public'
        },
        'ClubId',
        { transaction: t }
      );
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.addColumn(
        {
          tableName: 'Teams',
          schema: 'public'
        },
        'ClubId',
        {
          type: sequelize.DataTypes.STRING
        },
        { transaction: t }
      );
    });
  }
};
