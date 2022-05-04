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
          'homeScore',
          { type: sequelize.DataTypes.INTEGER, allowNull: true },
          { transaction: t }
        );
        await queryInterface.addColumn(
          {
            tableName: 'EncounterCompetitions',
            schema: 'event',
          },
          'awayScore',
          { type: sequelize.DataTypes.INTEGER, allowNull: true },
          { transaction: t }
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
        await queryInterface.removeColumn(
          {
            tableName: 'EncounterCompetitions',
            schema: 'event',
          },
          'homeScore',
          { transaction: t }
        );
        await queryInterface.removeColumn(
          {
            tableName: 'EncounterCompetitions',
            schema: 'event',
          },
          'awayScore',
          { transaction: t }
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
