/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-console */
'use strict';
const { v4: uuidv4 } = require('uuid');

const dummyRankingSystem = 'dummy System';
const dummyRankingSystemGroup = 'dummy Group';

module.exports = {
  up: (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.bulkDelete(
          {
            tableName: 'RankingSystems',
            schema: 'ranking',
          },
          { name: dummyRankingSystem },
          { transaction: t, cascade: true }
        );

        await queryInterface.bulkDelete(
          {
            tableName: 'RankingGroups',
            schema: 'ranking',
          },
          { name: dummyRankingSystemGroup },
          { transaction: t, cascade: true }
        );

        const groups = await queryInterface.bulkInsert(
          {
            tableName: 'RankingGroups',
            schema: 'ranking',
          },
          [
            {
              id: uuidv4(),
              name: dummyRankingSystemGroup,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          { transaction: t, ignoreDuplicates: true, returning: ['id'] }
        );

        const systems = await queryInterface.bulkInsert(
          {
            tableName: 'RankingSystems',
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

        // make an array for each group with each system
        const groupSystems = [];

        for (let system of systems) {
          for (let group of groups) {
            groupSystems.push({
              groupId: group.id,
              systemId: system.id,
            });
          }
        }

        await queryInterface.bulkInsert(
          {
            tableName: 'RankingSystemRankingGroupMemberships',
            schema: 'ranking',
          },
          groupSystems,
          { transaction: t }
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
        {
          tableName: 'RankingSystems',
          schema: 'ranking',
        },
        { name: dummyRankingSystem },
        { transaction: t, cascade: true }
      );

      await queryInterface.bulkDelete(
        {
          tableName: 'RankingGroups',
          schema: 'ranking',
        },
        { name: dummyRankingSystemGroup },
        { transaction: t, cascade: true }
      );
    });
  },
};
