'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.addColumn(
        'Clubs',
        'abbreviation',
        {
          type: sequelize.DataTypes.STRING
        },
        { transaction: t }
      );
      await queryInterface.addColumn(
        'Teams',
        'abbreviation',
        {
          type: sequelize.DataTypes.STRING
        },
        { transaction: t }
      );
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeColumn('Clubs', 'abbreviation', {
        transaction: t
      });
      await queryInterface.removeColumn('Teams', 'abbreviation', {
        transaction: t
      });
    });
  }
};
