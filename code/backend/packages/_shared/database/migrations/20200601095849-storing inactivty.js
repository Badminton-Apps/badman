/* eslint-disable no-console */
'use strict';

module.exports = {
  up: (queryInterface, sequelize) => {
    const promise = Promise.all([
      queryInterface.addColumn('RankingSystems', 'inactivityAmount', { type: sequelize.DataTypes.INTEGER }),
      queryInterface.addColumn('RankingSystems', 'inactivityUnit', {
        type: sequelize.ENUM('months', 'weeks', 'days')
      })
    ]);

    promise.catch(err => {
      console.error('Failed migration', err);
    });

    return promise;
  },

  down: (queryInterface, sequelize) => {
    const promise = Promise.all([
      queryInterface.removeColumn('RankingSystems', 'inactivityAmount'),

      // ENUM types require special attention
      queryInterface.sequelize.query(
        'ALTER TABLE "RankingSystems" DROP COLUMN "inactivityUnit";DROP TYPE IF EXISTS "enum_RankingSystems_inactivityUnit";'
      )
    ]);

    promise.catch(err => {
      console.error('Failed migration', err);
    });

    return promise;
  }
};
