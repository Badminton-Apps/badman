'use strict';

module.exports = {
  up: (queryInterface, sequelize) => {
    return queryInterface.addColumn(
      'Players',
      'birthDate',
      {
        type: sequelize.DataTypes.DATE
      },
      { schema: 'public' }
    );
  },

  down: (queryInterface, sequelize) => {
    return queryInterface.removeColumn('Players', 'birthDate', {
      schema: 'public'
    });
  }
};
