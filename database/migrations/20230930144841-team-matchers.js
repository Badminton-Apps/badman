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
          { transaction: t },
        );

        // run update query for some clubs
        await queryInterface.sequelize.query(
          `
          UPDATE "Clubs"
          SET 
            "name" = 'La Fine Plume asbl',
            "fullName" = 'AXIS PARC LA FINE PLUME ASBL'
          WHERE
            "slug" = 'la-fine-plume-asbl'
			      AND "clubId" = 145

          `,
        );

        // run update query for some clubs
        await queryInterface.sequelize.query(
          `
          UPDATE "Clubs"
          SET 
            "name" = 'Verviers',
            "fullName" = 'ROYAL BADMINTON CLUB VERVIERS'
          WHERE
            "slug" = 'verviers'
			      AND "clubId" = 19

          `,
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
          { transaction: t },
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
