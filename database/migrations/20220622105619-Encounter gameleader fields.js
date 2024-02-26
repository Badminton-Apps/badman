/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.addColumn(
          {
            tableName: 'EncounterCompetitions',
            schema: 'event',
          },
          'gameLeaderId',
          {
            type: sequelize.DataTypes.STRING,
            allowNull: true,
            references: {
              model: {
                tableName: 'Players',
                schema: 'public',
              },
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          { transaction: t },
        );

        await queryInterface.addColumn(
          {
            tableName: 'EncounterCompetitions',
            schema: 'event',
          },
          'shuttle',
          {
            type: sequelize.DataTypes.STRING,
            allowNull: true,
          },
          { transaction: t },
        );
        await queryInterface.addColumn(
          {
            tableName: 'EncounterCompetitions',
            schema: 'event',
          },
          'startHour',
          {
            type: sequelize.DataTypes.STRING,
            allowNull: true,
          },
          { transaction: t },
        );
        await queryInterface.addColumn(
          {
            tableName: 'EncounterCompetitions',
            schema: 'event',
          },
          'endHour',
          {
            type: sequelize.DataTypes.STRING,
            allowNull: true,
          },
          { transaction: t },
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
            tableName: 'EncounterCompetitions',
            schema: 'event',
          },
          'gameLeaderId',
          { transaction: t },
        );

        await queryInterface.removeColumn(
          {
            tableName: 'EncounterCompetitions',
            schema: 'event',
          },
          'shuttle',
          { transaction: t },
        );
        await queryInterface.removeColumn(
          {
            tableName: 'EncounterCompetitions',
            schema: 'event',
          },
          'startHour',
          { transaction: t },
        );
        await queryInterface.removeColumn(
          {
            tableName: 'EncounterCompetitions',
            schema: 'event',
          },
          'endHour',
          { transaction: t },
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
