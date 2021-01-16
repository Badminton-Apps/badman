'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    await queryInterface.dropTable('RankingTypes');
  },

  down: async (queryInterface, sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};
