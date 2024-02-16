/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // expand encounter with scores entered and scores accepted columns
        await queryInterface.removeColumn(
          { tableName: 'Notifications', schema: 'personal' },
          'message',
          { transaction: t },
        );
        await queryInterface.removeColumn(
          { tableName: 'Notifications', schema: 'personal' },
          'title',
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
      // drop encounter accepted column
      await queryInterface.addColumn(
        { tableName: 'Notifications', schema: 'personal' },
        'message',
        {
          type: sequelize.DataTypes.STRING,
          allowNull: true,
        },
        { transaction: t },
      );

      await queryInterface.addColumn(
        { tableName: 'Notifications', schema: 'personal' },
        'title',
        {
          type: sequelize.DataTypes.STRING,
          allowNull: true,
        },
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
