/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // rename year to season in team
        await queryInterface.renameColumn('Teams', 'year', 'season', {
          transaction: t,
        });
      } catch (err) {
        console.error('We errored with', err?.message ?? err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // rename season to year in team
        await queryInterface.renameColumn('Teams', 'season', 'year', {
          transaction: t,
        });
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
