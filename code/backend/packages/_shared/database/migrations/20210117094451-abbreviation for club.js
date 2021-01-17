'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.addColumn('Clubs', 'abbreviation', {
      type: sequelize.DataTypes.STRING
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.removeColumn('Clubs', 'abbreviation');
  }
};
