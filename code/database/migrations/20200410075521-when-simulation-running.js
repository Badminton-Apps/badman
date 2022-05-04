/* eslint-disable no-console */
'use strict';

module.exports = {
  up: (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      const promise = Promise.all([
        queryInterface.addColumn(
          'RankingSystems',
          'runCurrently',
          {
            type: sequelize.BOOLEAN
          },
          { transaction: t, schema: 'public' }
        ),
        queryInterface.addColumn(
          'RankingSystems',
          'runDate',
          {
            type: sequelize.DataTypes.DATE
          },
          { transaction: t, schema: 'public' }
        ),
        queryInterface.addColumn(
          'RankingSystems',
          'runById',
          {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: 'Players',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
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
        queryInterface.removeColumn('RankingSystems', 'runCurrently', {
          transaction: t,
          schema: 'public'
        }),
        queryInterface.removeColumn('RankingSystems', 'runDate', {
          transaction: t,
          schema: 'public'
        }),
        queryInterface.removeColumn('RankingSystems', 'runById', {
          transaction: t,
          schema: 'public'
        })
      ]);
      promise.catch(err => {
        console.error('Failed migration', err);
      });

      return promise;
    });
  }
};
