/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // update enum_Clubs_useForTeamName type so it adds 'teamName' as a value
        await queryInterface.sequelize.query(
          'ALTER TYPE "enum_Clubs_useForTeamName" ADD VALUE IF NOT EXISTS \'teamName\';',
          { transaction: t },
        );

        // add a new column 'teamName' to the 'Clubs' table
        await queryInterface.addColumn(
          'Clubs',
          'teamName',
          {
            type: sequelize.DataTypes.STRING,
            allowNull: true,
          },
          { transaction: t },
        );

        // copy the 'name' column to the 'teamName' column
        await queryInterface.sequelize.query('UPDATE "Clubs" SET "teamName" = "name";', {
          transaction: t,
        });

     
      } catch (err) {
        console.error('We errored with', err?.message ?? err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // update enum_Clubs_useForTeamName type so it removes 'teamName' as a value
        await queryInterface.sequelize.query(
          'ALTER TYPE "enum_Clubs_useForTeamName" DROP VALUE IF EXISTS \'teamName\';',
          { transaction: t },
        );

        // remove the column 'teamName' from the 'Clubs' table
        await queryInterface.removeColumn('Clubs', 'teamName', { transaction: t });
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
