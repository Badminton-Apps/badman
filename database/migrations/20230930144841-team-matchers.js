/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // create a team-matcher column on the event table
        await queryInterface.addColumn(
          { tableName: 'EventCompetitions', schema: 'event' },
          'teamMatcher',
          {
            type: sequelize.DataTypes.STRING,
            allowNull: true,
          },
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
        // drop team-matcher column
        await queryInterface.removeColumn(
          { tableName: 'EventCompetitions', schema: 'event' },
          'teamMatcher',
          { transaction: t }
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
