'use strict';

module.exports = {
  up: (queryInterface, sequelize) => {
    return queryInterface.addColumn('RankingSystems', 'gamesForInactivty', {
      type: sequelize.DataTypes.INTEGER
    });
    
  },

  down: (queryInterface, sequelize) => {
    return queryInterface.removeColumn('RankingSystems', 'gamesForInactivty');
    
  }
};
