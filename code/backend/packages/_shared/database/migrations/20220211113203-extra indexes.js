'use strict';

module.exports = {
  up: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.sequelize.query(
          `DELETE FROM  "ranking"."Points" WHERE id IN (SELECT id FROM (SELECT id, ROW_NUMBER() OVER( PARTITION BY "GameId", "SystemId") AS row_num FROM  "ranking"."Points" ) t WHERE t.row_num > 1 );`,
          { transaction: t }
        );
        // await queryInterface.sequelize.query(
        //   `DELETE FROM  "ranking"."Places" WHERE id IN (SELECT id FROM (SELECT id, ROW_NUMBER() OVER( PARTITION BY "playerId", "SystemId", "rankingDate") AS row_num FROM  "ranking"."Places" ) t WHERE t.row_num > 1 );`,
        //   { transaction: t }
        // );

        await queryInterface.removeIndex(
          {
            tableName: 'Places',
            schema: 'ranking',
          },
          'ranking_index',
          {
            transaction: t,
            timeout: 90000,
          }
        );

        await queryInterface.addIndex(
          {
            tableName: 'Places',
            schema: 'ranking',
          },
          {
            fields: ['playerId', 'SystemId', 'rankingDate'],
            using: 'btree',
            unique: true,
            name: 'places_system_index',
            transaction: t,
            timeout: 90000,
          }
        );

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

        

        // await queryInterface.addIndex(
        //   {
        //     tableName: 'Points',
        //     schema: 'ranking',
        //   },
        //   {
        //     fields: ['playerId', 'SystemId', 'rankingDate'],
        //     using: 'btree',
        //     unique: true,
        //     name: 'point_system_index',
        //     transaction: t,
        //     timeout: 90000,
        //   }
        // );

        await queryInterface.addIndex(
          {
            tableName: 'Points',
            schema: 'ranking',
          },
          {
            fields: ['GameId', 'SystemId'],
            using: 'btree',
            unique: true,
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

        await queryInterface.addIndex(
          {
            tableName: 'Players',
            schema: 'public',
          },
          {
            fields: ['id'],
            using: 'btree',
            unique: true,
            name: 'players_id',
            transaction: t,
            timeout: 90000,
          }
        );
        await queryInterface.addIndex(
          {
            tableName: 'Players',
            schema: 'public',
          },
          {
            fields: ['slug'],
            using: 'btree',
            unique: true,
            name: 'players_slug',
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
        await queryInterface.removeIndex(
          {
            tableName: 'Places',
            schema: 'ranking',
          },
          'places_system_index',
          {
            transaction: t,
            timeout: 90000,
          }
        );


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

        await queryInterface.addIndex(
          {
            tableName: 'Places',
            schema: 'ranking',
          },
          {
            fields: ['playerId', 'SystemId'],
            using: 'btree',
            name: 'ranking_index',
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

        await queryInterface.removeIndex(
          {
            tableName: 'Players',
            schema: 'public',
          },
          'players_id',
          {
            transaction: t,
            timeout: 90000,
          }
        );

        await queryInterface.removeIndex(
          {
            tableName: 'Players',
            schema: 'public',
          },
          'players_slug',
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
};
