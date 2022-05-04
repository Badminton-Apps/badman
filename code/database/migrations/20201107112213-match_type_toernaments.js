/* eslint-disable no-console */
'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    await queryInterface.addColumn('SubEvents', 'gameType', {
      type: sequelize.DataTypes.ENUM('S', 'D', 'MX')
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      const promise = Promise.all([
        queryInterface.removeColumn('SubEvents', 'gameType', {transaction: t}),
        queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_SubEvents_gameType";', {
          transaction: t
        }),
      ]);
      promise.catch(err => {
        console.error('Failed migration', err);
      });

      return promise;
    });
  }
};
