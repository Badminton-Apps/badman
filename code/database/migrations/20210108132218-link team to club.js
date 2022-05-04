'use strict';

module.exports = {
  up: (queryInterface, sequelize) => {
    return queryInterface.addColumn('Teams', 'ClubId', {
      type: sequelize.DataTypes.INTEGER,
      references: {
        model: 'Clubs',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  down: (queryInterface, sequelize) => {
    return queryInterface.removeColumn('Teams', 'ClubId', {
      schema: 'public'
    });
  }
};
