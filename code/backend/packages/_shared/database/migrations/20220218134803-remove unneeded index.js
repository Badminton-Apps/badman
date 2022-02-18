'use strict';

module.exports = {
  up: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.removeIndex(
          {
            tableName: 'Places',
            schema: 'ranking',
          },
          'places_date_index',
          {
            transaction: t,
            timeout: 90000,
          }
        );

        await queryInterface.removeIndex(
          {
            tableName: 'Points',
            schema: 'ranking',
          },
          'point_player_system_index',
          {
            transaction: t,
            timeout: 90000,
          }
        );
        await queryInterface.removeIndex(
          {
            tableName: 'Points',
            schema: 'ranking',
          },
          'point_system_index',
          {
            transaction: t,
            timeout: 90000,
          }
        );
        await queryInterface.removeIndex(
          {
            tableName: 'Points',
            schema: 'ranking',
          },
          'points_date_index',
          {
            transaction: t,
            timeout: 90000,
          }
        );



      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {


        await queryInterface.addIndex(
          {
            tableName: 'Places',
            schema: 'ranking',
          },
          {
            fields: ['rankingDate'],
            using: 'BRIN',
            name: 'places_date_index',
            transaction: t,
            timeout: 90000,
          }
        );

             
        await queryInterface.addIndex(
          {
            tableName: 'Points',
            schema: 'ranking',
          },
          {
            fields: ['playerId', 'GameId', 'SystemId'],
            using: 'btree',
            unique: true,
            name: 'point_player_system_index',
            transaction: t,
            timeout: 90000,
          }
        );

        await queryInterface.addIndex(
          {
            tableName: 'Points',
            schema: 'ranking',
          },
          {
            fields: ['playerId', 'SystemId'],
            using: 'btree',
            name: 'point_system_index',
            transaction: t,
            timeout: 90000,
          }
        );

        
        await queryInterface.addIndex(
          {
            tableName: 'Points',
            schema: 'ranking',
          },
          {
            fields: ['rankingDate'],
            using: 'BRIN',
            name: 'points_date_index',
            transaction: t,
            timeout: 90000,
          }
        );



      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
