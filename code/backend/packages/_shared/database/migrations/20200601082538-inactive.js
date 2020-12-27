/* eslint-disable no-console */
'use strict';

module.exports = {
  up: (queryInterface, sequelize) => {
    const promise = Promise.all([
      queryInterface.removeColumn('RankingPlaces', 'lastDowngradeSingle'),
      queryInterface.removeColumn('RankingPlaces', 'lastDowngradeDoubles'),
      queryInterface.removeColumn('RankingPlaces', 'lastDowngradeMix'),
      queryInterface.addColumn('RankingPlaces', 'singleInactive', {
        type: sequelize.DataTypes.BOOLEAN,
        defaultValue: false
      }),
      queryInterface.addColumn('RankingPlaces', 'doubleInactive', {
        type: sequelize.DataTypes.BOOLEAN,
        defaultValue: false
      }),
      queryInterface.addColumn('RankingPlaces', 'mixInactive', {
        type: sequelize.DataTypes.BOOLEAN,
        defaultValue: false
      })
    ]);

    promise.catch(err => {
      console.error('Failed migration', err);
    });

    return promise;
  },

  down: (queryInterface, sequelize) => {
    const promise = Promise.all([
      queryInterface.removeColumn('RankingPlaces', 'singleInactive'),
      queryInterface.removeColumn('RankingPlaces', 'doubleInactive'),
      queryInterface.removeColumn('RankingPlaces', 'mixInactive'),

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
  }
};
