/* eslint-disable no-console */
'use strict';

module.exports = {
  up: (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      const promise = Promise.all([
        queryInterface.addColumn(
          'RankingSystems',
          'maxLevelUpPerChange',
          {
            type: sequelize.DataTypes.INTEGER
          },
          { transaction: t, schema: 'public' }
        ),
        queryInterface.addColumn(
          'RankingSystems',
          'maxLevelDownPerChange',
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
        queryInterface.removeColumn('RankingSystems', 'maxLevelUpPerChange', {
          transaction: t, schema: 'public'
        }),
        queryInterface.removeColumn('RankingSystems', 'maxLevelDownPerChange', {
          transaction: t, schema: 'public'
        })
      ]);

      promise.catch(err => {
        console.error('Failed migration', err);
      });

      return promise;
    });
  }
};
