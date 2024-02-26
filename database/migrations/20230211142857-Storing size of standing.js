/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        console.log('Adding column');

        // Add column "date" to entries table
        await queryInterface.addColumn(
          {
            tableName: 'Standings',
            schema: 'event',
          },
          'size',
          {
            type: sequelize.DataTypes.INTEGER,
            allowNull: true,
          },
          {
            transaction: t,
          },
        );

        console.log('Done');
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
            tableName: 'Entries',
            schema: 'event',
          },
          'size',
          {
            transaction: t,
          },
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
