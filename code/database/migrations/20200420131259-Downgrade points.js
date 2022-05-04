/* eslint-disable no-console */
'use strict';

module.exports = {
  up: (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      const promise = Promise.all([
        queryInterface.addColumn(
          'RankingPlaces',
          'singlePointsDowngrade',
          {
            type: sequelize.DataTypes.INTEGER
          },
          { transaction: t, schema: 'public' }
        ),
        queryInterface.addColumn(
          'RankingPlaces',
          'doublePointsDowngrade',
          {
            type: sequelize.DataTypes.INTEGER
          },
          { transaction: t, schema: 'public' }
        ),
        queryInterface.addColumn(
          'RankingPlaces',
          'mixPointsDowngrade',
          {
            type: sequelize.DataTypes.INTEGER
          },
          { transaction: t, schema: 'public' }
        )
      ]);
      promise.catch(err => {
        console.error('Failed migration', err);
      });

      return promise;
    });
  },

  down: (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      const promise = Promise.all([
        queryInterface.removeColumn('RankingPlaces', 'singlePointsDowngrade', { transaction: t, schema: 'public' }),
        queryInterface.removeColumn('RankingPlaces', 'doublePointsDowngrade', { transaction: t, schema: 'public' }),
        queryInterface.removeColumn('RankingPlaces', 'mixPointsDowngrade', { transaction: t, schema: 'public' })
      ]);
      promise.catch(err => {
        console.error('Failed migration', err);
      });

      return promise;
    });
  }
};
