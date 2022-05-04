'use strict';

module.exports = {
  up: (queryInterface, sequelize) => {
    return queryInterface.renameColumn('Teams', 'lastName', 'name', {
      schema: 'public'
    });
  },

  down: (queryInterface, sequelize) => {
    return queryInterface.renameColumn('Teams', 'name', 'lastName', {
      schema: 'public'
    });
  }
};
