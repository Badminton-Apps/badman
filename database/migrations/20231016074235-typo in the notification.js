/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // change encounterChangeConformationNotification to encounterChangeConfirmationNotification
        await queryInterface.renameColumn(
          { tableName: 'Settings', schema: 'personal' },
          'encounterChangeConformationNotification',
          'encounterChangeConfirmationNotification',
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
        await queryInterface.renameColumn(
          { tableName: 'Settings', schema: 'personal' },
          'encounterChangeConfirmationNotification',
          'encounterChangeConformationNotification',
          { transaction: t },
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
