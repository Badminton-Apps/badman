/* eslint-disable no-console */
'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.createSchema('event', { transaction: t });
      console.log('Getting data');
      const [
        games
      ] = await queryInterface.sequelize.query(
        'SELECT * FROM public."Games";',
        { transaction: t }
      );
      const [
        gamePlayers
      ] = await queryInterface.sequelize.query(
        'SELECT * FROM public."GamePlayers";',
        { transaction: t }
      );
      const [
        events
      ] = await queryInterface.sequelize.query(
        'SELECT * FROM public."Events";',
        { transaction: t }
      );
      const [
        subEvents
      ] = await queryInterface.sequelize.query(
        'SELECT * FROM public."SubEvents";',
        { transaction: t }
      );

      console.log('Removing contraints');

      await queryInterface.removeConstraint(
        {
          tableName: 'Points',
          schema: 'ranking'
        },
        'Points_GameId_fkey',
        { transaction: t }
      );

      await queryInterface.removeConstraint(
        {
          tableName: 'Teams',
          schema: 'public'
        },
        'Teams_SubEventId_fkey',
        { transaction: t }
      );

      await queryInterface.removeConstraint(
        {
          tableName: 'GroupSubEvents',
          schema: 'ranking'
        },
        'GroupSubEvents_SubEventId_fkey',
        { transaction: t }
      );

      console.log('dropping tables');
      await queryInterface.dropTable(
        {
          tableName: 'GamePlayers',
          schema: 'public'
        },
        { transaction: t }
      );

      await queryInterface.dropTable(
        {
          tableName: 'Games',
          schema: 'public'
        },
        { transaction: t }
      );

      await queryInterface.dropTable(
        {
          tableName: 'SubEvents',
          schema: 'public'
        },
        { transaction: t }
      );

      await queryInterface.dropTable(
        {
          tableName: 'Events',
          schema: 'public'
        },
        { transaction: t }
      );

      await queryInterface.createTable(
        'Events',
        {
          id: {
            type: sequelize.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          toernamentNumber: {
            type: sequelize.DataTypes.INTEGER
          },
          firstDay: {
            type: sequelize.DataTypes.DATE
          },
          dates: {
            type: sequelize.DataTypes.STRING
          },

          name: sequelize.DataTypes.STRING,
          type: sequelize.DataTypes.ENUM('COMPETITION', 'TOERNAMENT'),
          uniCode: {
            type: sequelize.DataTypes.STRING
          },
          createdAt: {
            type: sequelize.DataTypes.DATE
          },
          updatedAt: {
            type: sequelize.DataTypes.DATE
          }
        },
        { transaction: t, schema: 'event' }
      );

      await queryInterface.createTable(
        'SubEvents',
        {
          id: {
            type: sequelize.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          name: sequelize.DataTypes.STRING,
          eventType: {
            type: sequelize.ENUM('M', 'F', 'MX', 'MINIBAD')
          },
          drawType: {
            type: sequelize.ENUM('KO', 'POULE', 'QUALIFICATION')
          },
          levelType: {
            type: sequelize.ENUM('PROV', 'LIGA', 'NATIONAAL')
          },
          level: sequelize.DataTypes.INTEGER,
          size: sequelize.DataTypes.INTEGER,

          EventId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: {
                tableName: 'Events',
                schema: 'event'
              },
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          internalId: {
            type: sequelize.DataTypes.INTEGER
          },
          gameType: {
            type: sequelize.DataTypes.ENUM('S', 'D', 'MX')
          },

          createdAt: sequelize.DataTypes.DATE,
          updatedAt: sequelize.DataTypes.DATE
        },
        { transaction: t, schema: 'event' }
      );

      await queryInterface.createTable(
        'Locations',
        {
          id: {
            type: sequelize.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },

          eventId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: {
                tableName: 'Events',
                schema: 'event'
              },
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },

          name: sequelize.DataTypes.STRING,

          address: sequelize.DataTypes.STRING,
          postalcode: sequelize.DataTypes.INTEGER,
          city: sequelize.DataTypes.STRING,
          state: sequelize.DataTypes.STRING,
          phone: sequelize.DataTypes.STRING,
          fax: sequelize.DataTypes.STRING,

          createdAt: sequelize.DataTypes.DATE,
          updatedAt: sequelize.DataTypes.DATE
        },
        { transaction: t, schema: 'event' }
      );

      await queryInterface.createTable(
        'Courts',
        {
          id: {
            type: sequelize.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          name: sequelize.DataTypes.STRING,
          locationId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: {
                tableName: 'Locations',
                schema: 'event'
              },
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          createdAt: sequelize.DataTypes.DATE,
          updatedAt: sequelize.DataTypes.DATE
        },
        { transaction: t, schema: 'event' }
      );

      await queryInterface.createTable(
        'Games',
        {
          id: {
            type: sequelize.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          playedAt: sequelize.DataTypes.DATE,
          gameType: {
            type: sequelize.ENUM('S', 'D', 'MX')
          },

          set1Team1: sequelize.DataTypes.INTEGER,
          set1Team2: sequelize.DataTypes.INTEGER,
          set2Team1: sequelize.DataTypes.INTEGER,
          set2Team2: sequelize.DataTypes.INTEGER,
          set3Team1: sequelize.DataTypes.INTEGER,
          set3Team2: sequelize.DataTypes.INTEGER,
          winner: sequelize.DataTypes.INTEGER,

          subEventId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: {
                tableName: 'SubEvents',
                schema: 'event'
              },
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          courtId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: {
                tableName: 'Courts',
                schema: 'event'
              },
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          createdAt: sequelize.DataTypes.DATE,
          updatedAt: sequelize.DataTypes.DATE
        },
        { transaction: t, schema: 'event' }
      );

      await queryInterface.createTable(
        'GamePlayers',
        {
          team: sequelize.DataTypes.INTEGER,
          player: sequelize.DataTypes.INTEGER,
          playerId: {
            type: sequelize.DataTypes.INTEGER,
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
          gameId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: {
                tableName: 'Games',
                schema: 'event'
              },
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          }
        },
        { transaction: t, schema: 'event' }
      );



      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Events_type";', {
        transaction: t,
      });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_SubEvents_drawType";', {
        transaction: t,
      });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_SubEvents_gameType";', {
        transaction: t,
      });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_SubEvents_levelType";', {
        transaction: t,
      });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_SubEvents_eventType";', {
        transaction: t,
      });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Games_gameType";', {
        transaction: t,
      });


      console.log('Adding data');

      if (events.length > 0) {
        await queryInterface.bulkInsert(
          { tableName: 'Events', schema: 'event' },
          events,
          { transaction: t }
        );
      }

      if (subEvents.length > 0) {
        await queryInterface.bulkInsert(
          { tableName: 'SubEvents', schema: 'event' },
          subEvents,
          { transaction: t }
        );
      }

      if (games.length > 0) {
        await queryInterface.bulkInsert(
          { tableName: 'Games', schema: 'event' },
          games.map(r => {
            const subId = r.SubEventId;
            delete r.SubEventId;
            return {
              ...r,
              subEventId: subId
            };
          }),
          { transaction: t }
        );
      }

      if (gamePlayers.length > 0) {
        await queryInterface.bulkInsert(
          { tableName: 'GamePlayers', schema: 'event' },
          gamePlayers,
          { transaction: t }
        );
      }

      console.log('Re-link constrained');

      await queryInterface.addConstraint(
        {
          tableName: 'Teams',
          schema: 'public'
        },
        {
          type: 'foreign key',
          name: 'Teams_SubEventId_fkey',
          fields: ['SubEventId'],
          references: {
            table: {
              tableName: 'SubEvents',
              schema: 'event'
            },
            field: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          transaction: t
        }
      );

      await queryInterface.addConstraint(
        {
          tableName: 'GroupSubEvents',
          schema: 'ranking'
        },
        {
          type: 'foreign key',
          name: 'GroupSubEvents_SubEventId_fkey',
          fields: ['SubEventId'],
          references: {
            table: {
              tableName: 'SubEvents',
              schema: 'event'
            },
            field: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          transaction: t
        }
      );

      await queryInterface.addConstraint(
        {
          tableName: 'Points',
          schema: 'ranking'
        },
        {
          type: 'foreign key',
          name: 'Points_GameId_fkey',
          fields: ['GameId'],
          references: {
            table: {
              tableName: 'Games',
              schema: 'event'
            },
            field: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          transaction: t
        }
      );
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      const [
        games
      ] = await queryInterface.sequelize.query(
        'SELECT * FROM "event"."Games";',
        { transaction: t }
      );
      const [
        gamePlayers
      ] = await queryInterface.sequelize.query(
        'SELECT * FROM "event"."GamePlayers";',
        { transaction: t }
      );
      const [
        events
      ] = await queryInterface.sequelize.query(
        'SELECT * FROM "event"."Events";',
        { transaction: t }
      );
      const [
        subEvents
      ] = await queryInterface.sequelize.query(
        'SELECT * FROM "event"."SubEvents";',
        { transaction: t }
      );

      console.log('Removing contraints');

      await queryInterface.removeConstraint(
        {
          tableName: 'Points',
          schema: 'ranking'
        },
        'Points_GameId_fkey',
        { transaction: t }
      );

      await queryInterface.removeConstraint(
        {
          tableName: 'Teams',
          schema: 'public'
        },
        'Teams_SubEventId_fkey',
        { transaction: t }
      );

      await queryInterface.removeConstraint(
        {
          tableName: 'GroupSubEvents',
          schema: 'ranking'
        },
        'GroupSubEvents_SubEventId_fkey',
        { transaction: t }
      );

      await queryInterface.dropSchema('event', { transaction: t });

      await queryInterface.createTable(
        'Events',
        {
          id: {
            type: sequelize.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          toernamentNumber: {
            type: sequelize.DataTypes.INTEGER
          },
          firstDay: {
            type: sequelize.DataTypes.DATE
          },
          dates: {
            type: sequelize.DataTypes.STRING
          },

          name: sequelize.DataTypes.STRING,
          type: sequelize.DataTypes.ENUM('COMPETITION', 'TOERNAMENT'),
          uniCode: {
            type: sequelize.DataTypes.STRING
          },
          createdAt: {
            type: sequelize.DataTypes.DATE
          },
          updatedAt: {
            type: sequelize.DataTypes.DATE
          }
        },
        { transaction: t, schema: 'public' }
      );

      await queryInterface.createTable(
        'SubEvents',
        {
          id: {
            type: sequelize.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          name: sequelize.DataTypes.STRING,
          eventType: {
            type: sequelize.DataTypes.ENUM('M', 'F', 'MX', 'MINIBAD')
          },
          drawType: {
            type: sequelize.DataTypes.ENUM('KO', 'POULE', 'QUALIFICATION')
          },
          levelType: {
            type: sequelize.DataTypes.ENUM('PROV', 'LIGA', 'NATIONAAL')
          },
          level: sequelize.DataTypes.INTEGER,
          size: sequelize.DataTypes.INTEGER,

          EventId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: {
                tableName: 'Events',
                schema: 'public'
              },
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          internalId: {
            type: sequelize.DataTypes.INTEGER
          },
          gameType: {
            type: sequelize.DataTypes.ENUM('S', 'D', 'MX')
          },

          createdAt: sequelize.DataTypes.DATE,
          updatedAt: sequelize.DataTypes.DATE
        },
        { transaction: t, schema: 'public' }
      );

      await queryInterface.createTable(
        'Games',
        {
          id: {
            type: sequelize.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          playedAt: sequelize.DataTypes.DATE,
          gameType: {
            type: sequelize.ENUM('S', 'D', 'MX')
          },

          set1Team1: sequelize.DataTypes.INTEGER,
          set1Team2: sequelize.DataTypes.INTEGER,
          set2Team1: sequelize.DataTypes.INTEGER,
          set2Team2: sequelize.DataTypes.INTEGER,
          set3Team1: sequelize.DataTypes.INTEGER,
          set3Team2: sequelize.DataTypes.INTEGER,
          winner: sequelize.DataTypes.INTEGER,

          SubEventId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: 'SubEvents',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          createdAt: sequelize.DataTypes.DATE,
          updatedAt: sequelize.DataTypes.DATE
        },
        { transaction: t, schema: 'public' }
      );

      await queryInterface.createTable(
        'GamePlayers',
        {
          team: sequelize.DataTypes.INTEGER,
          player: sequelize.DataTypes.INTEGER,
          playerId: {
            type: sequelize.DataTypes.INTEGER,
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
          gameId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: {
                tableName: 'Games',
                schema: 'public'
              },
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          }
        },
        { transaction: t, schema: 'public' }
      );

      console.log('Adding data');
      if (events.length > 0) {
        await queryInterface.bulkInsert(
          { tableName: 'Events', schema: 'public' },
          events,
          { transaction: t }
        );
      }

      if (subEvents.length > 0) {
        await queryInterface.bulkInsert(
          { tableName: 'SubEvents', schema: 'public' },
          subEvents,
          { transaction: t }
        );
      }

      if (games.length > 0) {
        await queryInterface.bulkInsert(
          { tableName: 'Games', schema: 'public' },
          games,
          { transaction: t }
        );
      }

      if (gamePlayers.length > 0) {
        await queryInterface.bulkInsert(
          { tableName: 'GamePlayers', schema: 'public' },
          gamePlayers,
          { transaction: t }
        );
      }

      console.log('Re-link constrained');

      await queryInterface.addConstraint(
        {
          tableName: 'Teams',
          schema: 'public'
        },
        {
          type: 'foreign key',
          name: 'Teams_SubEventId_fkey',
          fields: ['SubEventId'],
          references: {
            table: {
              tableName: 'SubEvents',
              schema: 'public'
            },
            field: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          transaction: t
        }
      );

      await queryInterface.addConstraint(
        {
          tableName: 'GroupSubEvents',
          schema: 'ranking'
        },
        {
          type: 'foreign key',
          name: 'GroupSubEvents_SubEventId_fkey',
          fields: ['SubEventId'],
          references: {
            table: {
              tableName: 'SubEvents',
              schema: 'public'
            },
            field: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          transaction: t
        }
      );

      await queryInterface.addConstraint(
        {
          tableName: 'Points',
          schema: 'ranking'
        },
        {
          type: 'foreign key',
          name: 'Points_GameId_fkey',
          fields: ['GameId'],
          references: {
            table: {
              tableName: 'Games',
              schema: 'public'
            },
            field: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          transaction: t
        }
      );
    });
  }
};
