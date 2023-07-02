/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {

        // set all current accepted to true
        await queryInterface.sequelize.query(
          `UPDATE "event"."EncounterChanges" SET "accepted" = true`,
          { transaction: t }
        );

        // set default column value to false
        await queryInterface.changeColumn(
          {
            tableName: 'EncounterChanges',
            schema: 'event',
          },
          'accepted',
          {
            type: sequelize.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          {
            transaction: t,
          }
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
        await queryInterface.changeColumn(
          {
            tableName: 'EncounterChanges',
            schema: 'event',
          },
          'accepted',
          {
            type: sequelize.DataTypes.BOOLEAN,
            allowNull: true,
          },
          {
            transaction: t,
          }
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
