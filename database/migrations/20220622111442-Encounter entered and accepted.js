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
          'enteredById',
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
          'acceptedById',
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
          'enteredOn',
          {
            type: sequelize.DataTypes.DATE,
            allowNull: true,
          },
          { transaction: t },
        );
        await queryInterface.addColumn(
          {
            tableName: 'EncounterCompetitions',
            schema: 'event',
          },
          'acceptedOn',
          {
            type: sequelize.DataTypes.DATE,
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
          'enteredById',
          { transaction: t },
        );

        await queryInterface.removeColumn(
          {
            tableName: 'EncounterCompetitions',
            schema: 'event',
          },
          'acceptedById',
          { transaction: t },
        );
        await queryInterface.removeColumn(
          {
            tableName: 'EncounterCompetitions',
            schema: 'event',
          },
          'enteredOn',
          { transaction: t },
        );
        await queryInterface.removeColumn(
          {
            tableName: 'EncounterCompetitions',
            schema: 'event',
          },
          'acceptedOn',
          { transaction: t },
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
