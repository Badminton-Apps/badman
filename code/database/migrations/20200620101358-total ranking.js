/* eslint-disable no-console */
'use strict';

module.exports = {
  up: (queryInterface, sequelize) => {
    const promise = Promise.all([
      queryInterface.addColumn('RankingPlaces', 'totalSingleRanking', {
        type: sequelize.DataTypes.INTEGER
      }),
      queryInterface.addColumn('RankingPlaces', 'totalDoubleRanking', {
        type: sequelize.DataTypes.INTEGER
      }),
      queryInterface.addColumn('RankingPlaces', 'totalMixRanking', {
        type: sequelize.DataTypes.INTEGER
      }),
      queryInterface.addColumn('RankingPlaces', 'totalWithinSingleLevel', {
        type: sequelize.DataTypes.INTEGER
      }),
      queryInterface.addColumn('RankingPlaces', 'totalWithinDoubleLevel', {
        type: sequelize.DataTypes.INTEGER
      }),
      queryInterface.addColumn('RankingPlaces', 'totalWithinMixLevel', {
        type: sequelize.DataTypes.INTEGER
      }),
    ]);

    promise.catch(err => {
      console.error('Failed migration', err);
    });

    return promise;
  },

  down: (queryInterface, sequelize) => {
    const promise = Promise.all([
      queryInterface.removeColumn('RankingPlaces', 'totalSingleRanking'),
      queryInterface.removeColumn('RankingPlaces', 'totalDoubleRanking'),
      queryInterface.removeColumn('RankingPlaces', 'totalMixRanking'),
      queryInterface.removeColumn('RankingPlaces', 'totalWithinSingleLevel'),
      queryInterface.removeColumn('RankingPlaces', 'totalWithinDoubleLevel'),
      queryInterface.removeColumn('RankingPlaces', 'totalWithinMixLevel'),
    ]);

    promise.catch(err => {
      console.error('Failed migration', err);
    });

    return promise;
  }
};
