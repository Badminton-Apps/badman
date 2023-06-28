/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.addColumn(
          {
            tableName: 'EncounterChanges',
            schema: 'event',
          },
          'finished',
          {
            type: sequelize.DataTypes.BOOLEAN,
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
        await queryInterface.removeColumn(
          {
            tableName: 'EncounterChanges',
            schema: 'event',
          },
          'finished',
          { transaction: t }
        );

       
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
