'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      try {
        await queryInterface.addColumn(
          {
            tableName: 'TeamSubEventMemberships',
            schema: 'event'
          },
          'meta',
          {
            type: sequelize.DataTypes.TEXT,
            allowNull: true
          },
          { transaction: t }
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeColumn(
        {
          tableName: 'TeamSubEventMemberships',
          schema: 'event'
        },
        'meta',
        { transaction: t }
      );
    });
  }
};
