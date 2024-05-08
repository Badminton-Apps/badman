/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const { type } = require('node:os');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        const [memberships] = await queryInterface.sequelize.query(
          `SELECT * FROM event."TeamLocationCompetitions"`
        );

        await queryInterface.addColumn(
          {
            tableName: 'Teams',
            schema: 'public',
          },
          'prefferedLocationId',
          {
            type: sequelize.DataTypes.UUID,
            references: {
              model: {
                tableName: 'Locations',
                schema: 'event',
              },
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            allowNull: true,
          },
          {
            transaction: t,
          },
        );

        await queryInterface.addColumn(
          {
            tableName: 'Teams',
            schema: 'public',
          },
          'prefferedLocation2Id',
          {
            type: sequelize.DataTypes.UUID,
            references: {
              model: {
                tableName: 'Locations',
                schema: 'event',
              },
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            allowNull: true,
          },
          {
            transaction: t,
          },
        );

        await queryInterface.dropTable(
          {
            tableName: 'TeamLocationCompetitions',
            schema: 'event',
          },
          { transaction: t },
        );

        
        const firstPrefferdDone = [];
        const secondPrefferdDone = [];

        // insert data back to the new column
        for (const membership of memberships) {
          await queryInterface.sequelize.query(
            `UPDATE "Teams" SET "prefferedLocationId" = '${membership.locationId}' WHERE id = '${membership.teamId}'`,
            { transaction: t }
          );
        }
      } catch (err) {
        console.error('We errored with', err?.message ?? err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.createTable(
          {
            tableName: 'TeamLocationCompetitions',
            schema: 'event',
          },
          {
            teamId: {
              type: sequelize.DataTypes.UUID,
              references: {
                model: {
                  tableName: 'Teams',
                  schema: 'public',
                },
                key: 'id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
              allowNull: false,
            },
            locationId: {
              type: sequelize.DataTypes.UUID,
              references: {
                model: {
                  tableName: 'Locations',
                  schema: 'event',
                },
                key: 'id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
              allowNull: false,
            },
          },
          { transaction: t },
        );

        await queryInterface.removeColumn(
          {
            tableName: 'Teams',
            schema: 'public',
          },
          'prefferedLocationId',
          { transaction: t },
        );
        await queryInterface.removeColumn(
          {
            tableName: 'Teams',
            schema: 'public',
          },
          'prefferedLocation2Id',
          { transaction: t },
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
