'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.renameColumn('Events', 'number', 'toernamentNumber');
  },

  down: async (queryInterface) => {
    await queryInterface.renameColumn('Events', 'toernamentNumber', 'number');
  }
};
