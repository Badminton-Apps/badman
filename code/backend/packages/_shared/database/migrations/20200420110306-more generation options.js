/* eslint-disable no-console */
'use strict';

module.exports = {
  up: (queryInterface, sequelize) => {
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
        queryInterface.addColumn(
          'RankingSystems',
          'startingType',
          {
            type: sequelize.ENUM('formula', 'tableLFBB', 'tableBVL'),
            defaultValue: 'formula'
          },
          { transaction: t, schema: 'public' }
        ),
        queryInterface.removeColumn(
          'RankingSystems',
          'pointsForUpgradeSameAsDowngrade',
          {
            transaction: t,
            schema: 'public'
          }
        ),
        queryInterface.removeColumn('RankingPoints', 'countsForDowngrade', {
          transaction: t,
          schema: 'public'
        }),
        queryInterface.addColumn(
          'RankingPoints',
          'differenceInLevel',
          { type: sequelize.DataTypes.INTEGER },
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
        queryInterface.removeColumn('RankingSystems', 'startingType', {
          transaction: t
        }),
        queryInterface.sequelize.query(
          'DROP TYPE IF EXISTS "enum_RankingSystems_startingType";',
          {
            transaction: t,
            schema: 'public'
          }
        ),
        queryInterface.addColumn(
          'RankingSystems',
          'pointsForUpgradeSameAsDowngrade',
          { type: sequelize.BOOLEAN },
          { transaction: t, schema: 'public' }
        ),
        queryInterface.addColumn(
          'RankingPoints',
          'countsForDowngrade',
          { type: sequelize.BOOLEAN },
          { transaction: t, schema: 'public' }
        ),
        queryInterface.removeColumn(
          'RankingSystems',
          'gamesAgainstHigherLevel',
          {
            transaction: t,
            schema: 'public'
          }
        ),
        queryInterface.removeColumn('RankingPoints', 'differenceInLevel', {
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
