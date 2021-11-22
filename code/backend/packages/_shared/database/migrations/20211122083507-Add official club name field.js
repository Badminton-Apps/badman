'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.addColumn(
        {
          tableName: 'Clubs',
          schema: 'public'
        },
        'fullName',
        { type: sequelize.DataTypes.STRING },
        { transaction: t }
      );

      await queryInterface.addColumn(
        {
          tableName: 'Clubs',
          schema: 'public'
        },
        'useForTeamName',
        {
          type: sequelize.ENUM('name', 'fullName', 'abbreviation'),
          defaultValue: 'name'
        },
        { transaction: t }
      );
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeColumn(
        {
          tableName: 'Clubs',
          schema: 'public'
        },
        'fullName',
        { transaction: t }
      );

      await queryInterface.removeColumn(
        {
          tableName: 'Clubs',
          schema: 'public'
        },
        'useForTeamName',
        { transaction: t }
      );
    });
  }
};
