/* eslint-disable no-console */
'use strict';
module.exports = {
  up: (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      const promise = Promise.all([
        queryInterface.addColumn(
          'RankingTypes',
          'procentWinning',
          { type: sequelize.DataTypes.INTEGER },
          {
            transaction: t,
            schema: 'public'
          }
        ),
        queryInterface.addColumn(
          'RankingTypes',
          'procentWinningPlus1',
          { type: sequelize.DataTypes.INTEGER },
          {
            transaction: t,
            schema: 'public'
          }
        ),
        queryInterface.addColumn(
          'RankingTypes',
          'procentLosing',
          { type: sequelize.DataTypes.INTEGER },
          {
            transaction: t,
            schema: 'public'
          }
        ),
        queryInterface.addColumn(
          'RankingTypes',
          'minNumberOfGamesUsedForUpgrade',
          { type: sequelize.DataTypes.INTEGER },
          { transaction: t, schema: 'public' }
        ),
        queryInterface.addColumn(
          'RankingTypes',
          'maxDiffLevels',
          { type: sequelize.DataTypes.INTEGER },
          {
            transaction: t,
            schema: 'public'
          }
        ),
        queryInterface.addColumn(
          'RankingTypes',
          'maxDiffLevelsHighest',
          { type: sequelize.DataTypes.INTEGER },
          {
            transaction: t,
            schema: 'public'
          }
        ),
        queryInterface.addColumn(
          'RankingTypes',
          'latestXGamesToUse',
          { type: sequelize.DataTypes.INTEGER },
          {
            transaction: t,
            schema: 'public'
          }
        ),

        queryInterface.addColumn(
          'RankingTypes',
          'intervalAmount',
          { type: sequelize.DataTypes.INTEGER },
          {
            transaction: t,
            schema: 'public'
          }
        ),
        queryInterface.addColumn(
          'RankingTypes',
          'intervalUnit',
          { type: sequelize.ENUM('months', 'weeks', 'days') },
          { transaction: t, schema: 'public' }
        ),
        queryInterface.addColumn(
          'RankingTypes',
          'intervalCalcAmount',
          { type: sequelize.DataTypes.INTEGER },
          {
            transaction: t,
            schema: 'public'
          }
        ),
        queryInterface.addColumn(
          'RankingTypes',
          'intervalCalcUnit',
          { type: sequelize.ENUM('months', 'weeks', 'days') },
          { transaction: t, schema: 'public' }
        ),
        queryInterface.addColumn(
          'RankingTypes',
          'pointsForUpgradeSameAsDowngrade',
          { type: sequelize.BOOLEAN },
          { transaction: t, schema: 'public' }
        ),
        queryInterface.addColumn(
          'RankingTypes',
          'rankingSystem',
          { type: sequelize.ENUM('BVL', 'ORIGINAL', 'LFBB') },
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
      return Promise.all([
        queryInterface.removeColumn('RankingTypes', 'procentWinning', {
          transaction: t,
          schema: 'public'
        }),
        queryInterface.removeColumn('RankingTypes', 'procentWinningPlus1', {
          transaction: t,
          schema: 'public'
        }),
        queryInterface.removeColumn('RankingTypes', 'procentLosing', {
          transaction: t,
          schema: 'public'
        }),
        queryInterface.removeColumn(
          'RankingTypes',
          'minNumberOfGamesUsedForUpgrade',
          {
            transaction: t,
            schema: 'public'
          }
        ),
        queryInterface.removeColumn('RankingTypes', 'maxDiffLevels', {
          transaction: t,
          schema: 'public'
        }),
        queryInterface.removeColumn('RankingTypes', 'maxDiffLevelsHighest', {
          transaction: t,
          schema: 'public'
        }),
        queryInterface.removeColumn('RankingTypes', 'latestXGamesToUse', {
          transaction: t,
          schema: 'public'
        }),
        queryInterface.removeColumn('RankingTypes', 'intervalAmount', {
          transaction: t,
          schema: 'public'
        }),
        queryInterface.removeColumn('RankingTypes', 'intervalCalcAmount', {
          transaction: t,
          schema: 'public'
        }),
        queryInterface.removeColumn(
          'RankingTypes',
          'pointsForUpgradeSameAsDowngrade',
          {
            transaction: t,
            schema: 'public'
          }
        ),

        // ENUM types require special attention
        queryInterface.removeColumn('RankingTypes', 'intervalUnit', {
          transaction: t,
          schema: 'public'
        }),
        queryInterface.sequelize.query(
          'DROP TYPE IF EXISTS "enum_RankingSystems_intervalUnit";',
          {
            transaction: t,
            schema: 'public'
          }
        ),
        queryInterface.removeColumn('RankingTypes', 'rankingSystem', {
          transaction: t,
          schema: 'public'
        }),
        queryInterface.sequelize.query(
          'DROP TYPE IF EXISTS "enum_RankingSystems_rankingSystem";',
          {
            transaction: t,
            schema: 'public'
          }
        ),
        queryInterface.removeColumn('RankingTypes', 'intervalCalcUnit', {
          transaction: t,
          schema: 'public'
        }),
        queryInterface.sequelize.query(
          'DROP TYPE IF EXISTS "enum_RankingSystems_intervalCalcUnit";',
          {
            transaction: t,
            schema: 'public'
          }
        )
      ]);
    });
  }
};
