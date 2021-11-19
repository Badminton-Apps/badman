'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeIndex(
        {
          tableName: 'LastPlaces',
          schema: 'ranking'
        },
        'lastPlaces_ranking_index',
        {
          transaction: t
        }
      );

      await queryInterface.addIndex(
        {
          tableName: 'LastPlaces',
          schema: 'ranking'
        },
        {
          fields: ['playerId', 'systemId'],
          type: 'unique',
          unique: true,
          name: 'lastPlaces_ranking_index',
          transaction: t
        }
      );
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeIndex(
        {
          tableName: 'LastPlaces',
          schema: 'ranking'
        },
        'lastPlaces_ranking_index',
        {
          transaction: t
        }
      );
      await queryInterface.addIndex(
        {
          tableName: 'LastPlaces',
          schema: 'ranking'
        },
        {
          fields: ['playerId'],
          type: 'unique',
          unique: true,
          name: 'lastPlaces_ranking_index',
          transaction: t
        }
      );
    });
  }
};
