/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.addColumn(
          {
            tableName: 'EncounterChangeDates',
            schema: 'event',
          },
          'locationId',
          {
            type: sequelize.DataTypes.UUID,
            allowNull: true,
            references: {
              model: {
                tableName: 'Locations',
                schema: 'event',
              },
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          { transaction: t }
        );
        await queryInterface.addColumn(
          {
            tableName: 'EncounterCompetitions',
            schema: 'event',
          },
          'locationId',
          {
            type: sequelize.DataTypes.UUID,
            allowNull: true,
            references: {
              model: {
                tableName: 'Locations',
                schema: 'event',
              },
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          { transaction: t }
        );

        // set homescore to 0 if null
        await queryInterface.sequelize.query(
          `UPDATE "event"."EncounterCompetitions" SET "homeScore" = 0 WHERE "homeScore" IS NULL;`,
          { transaction: t }
        );

        // set awayscore to 0 if null
        await queryInterface.sequelize.query(
          `UPDATE "event"."EncounterCompetitions" SET "awayScore" = 0 WHERE "awayScore" IS NULL;`,
          { transaction: t }
        );
      } catch (err) {
        console.error('We errored with', err?.message ?? err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.removeColumn(
          {
            tableName: 'EncounterChangeDates',
            schema: 'event',
          },
          'locationId',
          { transaction: t }
        );
        await queryInterface.removeColumn(
          {
            tableName: 'EncounterCompetitions',
            schema: 'event',
          },
          'locationId',
          { transaction: t }
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
