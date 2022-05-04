/* eslint-disable no-console */
'use strict';

module.exports = {
  up: (queryInterface, sequelize) => {
    const promise = Promise.all([
      queryInterface.addColumn('RankingPlaces', 'lastDowngradeSingle', {
        type: sequelize.DataTypes.DATE
      }),
      queryInterface.addColumn('RankingPlaces', 'lastDowngradeDoubles', {
        type: sequelize.DataTypes.DATE
      }),
      queryInterface.addColumn('RankingPlaces', 'lastDowngradeMix', {
        type: sequelize.DataTypes.DATE
      })
    ]);

    promise.catch(err => {
      console.error('Failed migration', err);
    });

    return promise;
  },

  down: (queryInterface, sequelize) => {
    const promise = Promise.all([
      queryInterface.removeColumn('RankingPlaces', 'lastDowngradeSingle'),
      queryInterface.removeColumn('RankingPlaces', 'lastDowngradeDoubles'),
      queryInterface.removeColumn('RankingPlaces', 'lastDowngradeMix')
    ]);

    promise.catch(err => {
      console.error('Failed migration', err);
    });

    return promise;
  }
};
