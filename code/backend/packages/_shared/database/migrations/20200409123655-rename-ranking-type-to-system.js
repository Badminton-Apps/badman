'use strict';

module.exports = {
  up: (queryInterface, sequelize) => {
    return queryInterface.renameTable('RankingTypes', 'RankingSystems', {schema: 'public'});
  },

  down: (queryInterface, sequelize) => {
    return queryInterface.renameTable('RankingSystems', 'RankingTypes', {schema: 'public'});
  }
};
