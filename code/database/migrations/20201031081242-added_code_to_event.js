'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    await queryInterface.addColumn('Events', 'uniCode', {
      type: sequelize.DataTypes.STRING
    })
  },

  down: async (queryInterface, sequelize) => {
    await queryInterface.removeColumn('Events', 'uniCode');
  }
};
