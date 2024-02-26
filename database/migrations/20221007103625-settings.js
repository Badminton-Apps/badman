/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // create settings schema
        await queryInterface.createSchema('personal', { transaction: t });

        // create notifications table
        // flagged enum for mail and notification:
        // - encounter entered
        // - encounter accepted
        await queryInterface.createTable(
          { tableName: 'Settings', schema: 'personal' },
          {
            id: {
              type: sequelize.DataTypes.STRING,
              primaryKey: true,
            },
            playerId: {
              type: sequelize.DataTypes.STRING,
              allowNull: false,
              references: {
                model: {
                  tableName: 'Players',
                  schema: 'public',
                },
                key: 'id',
              },
            },
            pushSubscriptions: {
              type: sequelize.DataTypes.JSON,
              allowNull: true,
            },
            encounterNotEnteredNotification: {
              type: sequelize.DataTypes.INTEGER,
              allowNull: false,
            },
            encounterNotAcceptedNotification: {
              type: sequelize.DataTypes.INTEGER,
              allowNull: false,
            },
            encounterChangeNewNotification: {
              type: sequelize.DataTypes.INTEGER,
              allowNull: false,
            },
            encounterChangeConformationNotification: {
              type: sequelize.DataTypes.INTEGER,
              allowNull: false,
            },
            encounterChangeFinishedNotification: {
              type: sequelize.DataTypes.INTEGER,
              allowNull: false,
            },
            createdAt: {
              type: sequelize.DataTypes.DATE,
              allowNull: false,
            },
            updatedAt: {
              type: sequelize.DataTypes.DATE,
              allowNull: false,
            },
          },
          { transaction: t },
        );

        // index on playerid
        await queryInterface.addIndex({ tableName: 'Settings', schema: 'personal' }, ['playerId'], {
          transaction: t,
        });

        // notification table
        await queryInterface.createTable(
          { tableName: 'Notifications', schema: 'personal' },
          {
            id: {
              type: sequelize.DataTypes.STRING,
              primaryKey: true,
            },
            sendToId: {
              type: sequelize.DataTypes.STRING,
              allowNull: false,
              references: {
                model: {
                  tableName: 'Players',
                  schema: 'public',
                },
                key: 'id',
              },
            },
            type: {
              type: sequelize.DataTypes.STRING,
              allowNull: false,
            },
            title: {
              type: sequelize.DataTypes.STRING,
              allowNull: true,
            },
            message: {
              type: sequelize.DataTypes.TEXT,
              allowNull: false,
            },
            linkType: {
              type: sequelize.DataTypes.STRING,
              allowNull: false,
            },
            linkId: {
              type: sequelize.DataTypes.STRING,
              allowNull: false,
            },
            read: {
              type: sequelize.DataTypes.BOOLEAN,
              allowNull: false,
            },
            meta: {
              type: sequelize.DataTypes.JSON,
            },
            createdAt: sequelize.DataTypes.DATE,
            updatedAt: sequelize.DataTypes.DATE,
          },
          { transaction: t },
        );

        // expand encounter with scores entered and scores accepted columns
        await queryInterface.addColumn(
          { tableName: 'EncounterCompetitions', schema: 'event' },
          'accepted',
          {
            type: sequelize.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          { transaction: t },
        );

        // set all accepted encounters to true before 2022-10-08
        await queryInterface.sequelize.query(
          `UPDATE "event"."EncounterCompetitions" SET "accepted" = true WHERE "accepted" IS NULL AND "createdAt" < '2022-10-08'`,
          { transaction: t },
        );
      } catch (err) {
        console.error('We errored with', err?.message ?? err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      // drop settings schema
      await queryInterface.dropSchema('personal', { transaction: t });

      // drop encounter accepted column
      await queryInterface.removeColumn(
        { tableName: 'EncounterCompetitions', schema: 'event' },
        'accepted',
        { transaction: t },
      );

      try {
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
