'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeColumn(
        {
          tableName: 'Systems',
          schema: 'ranking'
        },
        'runById',
        { transaction: t }
      );
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.addColumn(
        {
          tableName: 'Systems',
          schema: 'ranking'
        },
        'runById',
        {
          type: sequelize.DataTypes.STRING,
          references: {
            model: {
              tableName: 'Players',
              schema: 'public'
            },
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        { transaction: t }
      );
    });
  }
};
