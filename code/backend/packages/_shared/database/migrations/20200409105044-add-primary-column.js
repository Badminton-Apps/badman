'use strict';

module.exports = {
  up: (queryInterface, sequelize) => {
    return queryInterface.addColumn(
      'RankingTypes',
      'primary',
      {
        type: sequelize.DataTypes.BOOLEAN
      },
      { schema: 'public' }
    );
  },

  down: (queryInterface, sequelize) => {
    return queryInterface.removeColumn('RankingTypes', 'primary', {
      schema: 'public'
    });
  }
};
