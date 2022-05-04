'use strict';

module.exports = {
  up: (queryInterface, sequelize) => {
    return queryInterface.addColumn('ClubMemberships', 'active', {
      type: sequelize.DataTypes.BOOLEAN
    });
    
  },

  down: (queryInterface, sequelize) => {
    return queryInterface.removeColumn('ClubMemberships', 'active');
    
  }
};
