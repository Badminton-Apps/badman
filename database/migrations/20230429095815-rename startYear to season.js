/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      //  rename column eventCompeition startYear to season

      await queryInterface.renameColumn(
        {
          tableName: 'EventCompetitions',
          schema: 'event',
        },
        'startYear',
        'season',
        { transaction: t },
      );

      try {
      } catch (err) {
        console.error('We errored with', err?.message ?? err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.renameColumn(
        {
          tableName: 'EventCompetitions',
          schema: 'event',
        },
        'season',
        'startYear',
        { transaction: t },
      );

      try {
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
