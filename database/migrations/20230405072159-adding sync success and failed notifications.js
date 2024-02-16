/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.addColumn(
          {
            tableName: 'Settings',
            schema: 'personal',
          },
          'syncSuccessNotification',
          {
            type: sequelize.DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          { transaction: t },
        );

        await queryInterface.addColumn(
          {
            tableName: 'Settings',
            schema: 'personal',
          },
          'syncFailedNotification',
          {
            type: sequelize.DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          { transaction: t },
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
            tableName: 'Settings',
            schema: 'personal',
          },
          'syncSuccessNotification',
          { transaction: t },
        );

        await queryInterface.removeColumn(
          {
            tableName: 'Settings',
            schema: 'personal',
          },
          'syncFailedNotification',
          { transaction: t },
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
