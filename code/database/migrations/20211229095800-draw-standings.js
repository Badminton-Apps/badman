/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

var Fakerator = require('fakerator');
var fakerator = Fakerator();

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // Get memberships
        const [memberships] = await queryInterface.sequelize.query(
          'SELECT * FROM event."TeamSubEventMemberships";',
          { transaction: t }
        );

        // Create new version of entries table
        await queryInterface.createTable(
          {
            tableName: 'Entries',
            schema: 'event',
          },
          {
            id: {
              defaultValue: Sequelize.DataTypes.UUIDV4,
              type: Sequelize.DataTypes.STRING,
              primaryKey: true,
            },

            teamId: {
              type: Sequelize.DataTypes.STRING,
              allowNull: true,
              references: {
                model: {
                  tableName: 'Teams',
                  schema: 'public',
                },
                key: 'id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL',
            },
            player1Id: {
              type: Sequelize.DataTypes.STRING,
              allowNull: true,
              references: {
                model: {
                  tableName: 'Players',
                  schema: 'public',
                },
                key: 'id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL',
            },
            player2Id: {
              type: Sequelize.DataTypes.STRING,
              allowNull: true,
              references: {
                model: {
                  tableName: 'Players',
                  schema: 'public',
                },
                key: 'id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL',
            },

            // these are FK but determinde by the Type
            drawId: Sequelize.DataTypes.STRING,
            subEventId: Sequelize.DataTypes.STRING,
            entryType: Sequelize.DataTypes.STRING,

            // Other info
            meta: {
              type: Sequelize.DataTypes.JSON,
              allowNull: true,
            },
            createdAt: {
              type: Sequelize.DataTypes.DATE,
              allowNull: false,
            },
            updatedAt: {
              type: Sequelize.DataTypes.DATE,
              allowNull: false,
            },
          },
          { transaction: t }
        );

        // Insert entries from old table
        if (memberships.length > 0) {
          await queryInterface.bulkInsert(
            { tableName: 'Entries', schema: 'event' },
            memberships.map((r) => {
              const meta =
                (r.meta ?? null) != null
                  ? JSON.stringify({ competition: JSON.parse(r.meta) })
                  : null;

              return {
                id: fakerator.misc.uuid(),
                teamId: r.teamId,
                subEventId: r.subEventId,
                meta,
                entryType: meta != null ? 'competition' : undefined,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt,
              };
            }),
            { transaction: t }
          );
        }

        // Delete old table
        await queryInterface.dropTable(
          {
            tableName: 'TeamSubEventMemberships',
            schema: 'event',
          },
          {
            transaction: t,
          }
        );

        // Create standing table
        await queryInterface.createTable(
          {
            tableName: 'Standings',
            schema: 'event',
          },
          {
            id: {
              defaultValue: Sequelize.DataTypes.UUIDV4,
              type: Sequelize.DataTypes.STRING,
              primaryKey: true,
            },
            entryId: {
              type: Sequelize.DataTypes.STRING,
              references: {
                model: {
                  tableName: 'Entries',
                  schema: 'event',
                },
                key: 'id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            position: Sequelize.DataTypes.INTEGER,
            points: Sequelize.DataTypes.INTEGER,
            played: Sequelize.DataTypes.INTEGER,
            gamesWon: Sequelize.DataTypes.INTEGER,
            gamesLost: Sequelize.DataTypes.INTEGER,
            setsWon: Sequelize.DataTypes.INTEGER,
            setsLost: Sequelize.DataTypes.INTEGER,
            totalPointsWon: Sequelize.DataTypes.INTEGER,
            totalPointsLost: Sequelize.DataTypes.INTEGER,

            won: Sequelize.DataTypes.INTEGER,
            lost: Sequelize.DataTypes.INTEGER,
            tied: Sequelize.DataTypes.INTEGER,

            createdAt: {
              type: Sequelize.DataTypes.DATE,
              allowNull: false,
            },
            updatedAt: {
              type: Sequelize.DataTypes.DATE,
              allowNull: false,
            },
          },
          { transaction: t }
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // Rollback to original version of entries table

        // Get entries
        const [entries] = await queryInterface.sequelize.query(
          'SELECT * FROM event."Entries";',
          { transaction: t }
        );

        // Create old table
        await queryInterface.createTable(
          {
            tableName: 'TeamSubEventMemberships',
            schema: 'event',
          },
          {
            subEventId: {
              type: Sequelize.DataTypes.STRING,
              allowNull: false,
              primaryKey: true,
              references: {
                model: {
                  tableName: 'SubEventCompetitions',
                  schema: 'event',
                },
                key: 'id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            teamId: {
              type: Sequelize.DataTypes.STRING,
              allowNull: false,
              primaryKey: true,
              references: {
                model: {
                  tableName: 'Teams',
                  schema: 'public',
                },
                key: 'id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            createdAt: {
              type: Sequelize.DataTypes.DATE,
              allowNull: false,
            },
            meta: {
              type: Sequelize.DataTypes.TEXT,
              allowNull: true,
            },
            updatedAt: {
              type: Sequelize.DataTypes.DATE,
              allowNull: false,
            },
          },
          { transaction: t }
        );

        // Insert entries from old table
        await queryInterface.bulkInsert(
          { tableName: 'TeamSubEventMemberships', schema: 'event' },
          entries.map((e) => {
            let meta = JSON.parse(e.meta);
            if (meta.hasOwnProperty('competition')) {
              meta = meta['competition'];
            }

            return {
              teamId: e.teamId,
              subEventId: e.subEventId,
              meta: meta != null ? JSON.stringify(meta) : null,
              createdAt: e.createdAt,
              updatedAt: e.updatedAt,
            };
          }),
          { transaction: t }
        );

        // Delete tables
        await queryInterface.dropTable(
          {
            tableName: 'Standings',
            schema: 'event',
          },
          {
            transaction: t,
          }
        );

        await queryInterface.dropTable(
          {
            tableName: 'Entries',
            schema: 'event',
          },
          {
            transaction: t,
          }
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
