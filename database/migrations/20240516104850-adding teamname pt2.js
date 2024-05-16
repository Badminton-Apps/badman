/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // set the useForTeamName column to 'teamName' for all clubs that have currently 'name'
        await queryInterface.sequelize.query(
          'UPDATE "Clubs" SET "useForTeamName" = \'teamName\' WHERE "useForTeamName" = \'name\';',
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
      try {
        // set the useForTeamName column to 'name' for all clubs that have currently 'teamName'
        await queryInterface.sequelize.query(
          'UPDATE "Clubs" SET "useForTeamName" = \'name\' WHERE "useForTeamName" = \'teamName\';',
          { transaction: t },
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
