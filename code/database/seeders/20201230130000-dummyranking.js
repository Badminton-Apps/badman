/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-console */
'use strict';
const { v4: uuidv4 } = require('uuid');

const dummyRankingSystem = 'dummy system';

module.exports = {
  up: (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.bulkInsert(
          {
            tableName: 'Systems',
            schema: 'ranking',
          },
          [
            {
              id: uuidv4(),
              name: dummyRankingSystem,
              primary: true,
              rankingSystem: 'VISUAL',
              amountOfLevels: 12,
              procentWinning: 75,
              procentWinningPlus1: 50,
              procentLosing: 30,
              latestXGamesToUse: null,
              minNumberOfGamesUsedForUpgrade: 7,
              maxDiffLevels: 2,
              calculationIntervalUnit: 'weeks',
              caluclationIntervalAmount: 1,
              periodUnit: 'weeks',
              periodAmount: 128,
              updateIntervalUnit: 'months',
              updateIntervalAmount: 2,
              differenceForUpgrade: 1,
              differenceForDowngrade: 0,
              startingType: 'tableLFBB',
              maxLevelUpPerChange: null,
              maxLevelDownPerChange: 1,
              gamesForInactivty: 3,
              inactivityAmount: 103,
              inactivityUnit: 'weeks',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          { transaction: t, ignoreDuplicates: true, returning: ['id'] }
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },

  down: (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.bulkDelete(
        'Clubs',
        { name: dummyRankingSystem },
        { transaction: t }
      );
    });
  },
};
