/* eslint-disable no-console */
'use strict';

module.exports = {
  up: (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      const promise = Promise.all([
        queryInterface.removeColumn(
          'RankingSystems',
          'gamesAgainstHigherLevel',
          {
            transaction: t,
            schema: 'public'
          }
        ),
        queryInterface.addColumn(
          'RankingSystems',
          'differenceForUpgrade',
          {
            type: sequelize.DataTypes.INTEGER,
            defaultValue: 1
          },
          { transaction: t, schema: 'public' }
        ),
        queryInterface.addColumn(
          'RankingSystems',
          'differenceForDowngrade',
          {
            type: sequelize.DataTypes.INTEGER,
            defaultValue: 0
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
        queryInterface.addColumn(
          'RankingSystems',
          'gamesAgainstHigherLevel',
          {
            type: sequelize.DataTypes.INTEGER,
            defaultValue: 0
          },
          { transaction: t, schema: 'public' }
        ),
        queryInterface.removeColumn('RankingSystems', 'differenceForUpgrade', {
          transaction: t,
          schema: 'public'
        }),
        queryInterface.removeColumn(
          'RankingSystems',
          'differenceForDowngrade',
          { transaction: t, schema: 'public' }
        )
      ]);
      promise.catch(err => {
        console.error('Failed migration', err);
      });

      return promise;
    });
  }
};
