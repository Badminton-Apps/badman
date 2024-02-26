/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      // Create latest sync date for competion and tourament events
      await queryInterface.addColumn(
        {
          tableName: 'EventCompetitions',
          schema: 'event',
        },
        'lastSync',
        {
          type: sequelize.DataTypes.DATE,
          allowNull: true,
        },
        {
          transaction: t,
        },
      );

      await queryInterface.addColumn(
        {
          tableName: 'EventTournaments',
          schema: 'event',
        },
        'lastSync',
        {
          type: sequelize.DataTypes.DATE,
          allowNull: true,
        },
        {
          transaction: t,
        },
      );

      try {
      } catch (err) {
        console.error('We errored with', err?.message ?? err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.removeColumn(
        {
          tableName: 'EventCompetitions',
          schema: 'event',
        },
        'lastSync',
        {
          transaction: t,
        },
      );

      await queryInterface.removeColumn(
        {
          tableName: 'EventTournaments',
          schema: 'event',
        },
        'lastSync',
        {
          transaction: t,
        },
      );

      try {
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
