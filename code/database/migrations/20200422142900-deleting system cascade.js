'use strict';

module.exports = {
  up: (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(t => {});
  },

  down: (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(t => {});
  }
};
