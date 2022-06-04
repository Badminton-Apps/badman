/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-console */
'use strict';
const jsonPlayers = require('./players.json');
const moment = require('moment');

// import uuidv4
const { v4: uuidv4 } = require('uuid');

const dummyClubName = 'dummy club';
const dummyTeamName = 'Mix and Double dummy team';

module.exports = {
  up: (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.bulkDelete(
          'Clubs',
          { name: dummyClubName },
          { transaction: t, cascade: true }
        );
        await queryInterface.bulkDelete(
          'Teams',
          { name: dummyTeamName },
          { transaction: t, cascade: true }
        );
        await queryInterface.bulkDelete(
          'Players',
          { lastName: 'dummy' },
          { transaction: t, cascade: true }
        );

        const dbPrimarySystem = await queryInterface.rawSelect(
          {
            tableName: 'RankingSystems',
            schema: 'ranking',
          },
          {
            where: {
              primary: true,
            },
          },
          ['id']
        );

        const dummyClub = await queryInterface.bulkInsert(
          'Clubs',
          [
            {
              id: uuidv4(),
              slug: 'dummy-club-1',
              name: dummyClubName,
              fullName: dummyClubName,
              abbreviation: "dummy",
              clubId: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          { transaction: t, ignoreDuplicates: true, returning: ['id'] }
        );

        const dummyTeam = await queryInterface.bulkInsert(
          'Teams',
          [
            {
              id: uuidv4(),
              slug: 'dummy-team-1',
              name: dummyTeamName,
              createdAt: new Date(),
              updatedAt: new Date(),
              clubId: dummyClub[0].id,
            },
          ],
          { transaction: t, ignoreDuplicates: true, returning: ['id'] }
        );

        const players = [];
        const playersRanking = [];

        jsonPlayers.map((p) => {
          const { places, ...player } = p;
          players.push({
            id: uuidv4(),
            ...player,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          playersRanking.push(places);
        });

        const dummyPlayers = await queryInterface.bulkInsert(
          'Players',
          players,
          {
            transaction: t,
            ignoreDuplicates: true,
            returning: ['id'],
          }
        );

        for (const [i, playerRanking] of playersRanking.entries()) {
          playersRanking[i] = playerRanking.map((r) => {

            return {
              id: uuidv4(),
              ...r,
              playerId: dummyPlayers[i].id,
              systemId: dbPrimarySystem,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          });
        }

        await queryInterface.bulkInsert(
          {
            tableName: 'RankingPlaces',
            schema: 'ranking',
          },
          playersRanking.flat(),
          {
            transaction: t,
          }
        );

        await queryInterface.bulkInsert(
          {
            tableName: 'RankingLastPlaces',
            schema: 'ranking',
          },
          playersRanking.flat(),
          {
            transaction: t,
          }
        );


        const clubMemberships = dummyPlayers.map((r) => {
          return {
            id: uuidv4(),
            playerId: r.id,
            clubId: dummyClub[0].id,
            start: moment([2020, 0, 1]).toDate(),
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        });
        await queryInterface.bulkInsert(
          'ClubPlayerMemberships',
          clubMemberships,
          {
            transaction: t,
            ignoreDuplicates: true,
          }
        );

        const teamMemberships = dummyPlayers.map((r) => {
          return {
            id: uuidv4(),
            playerId: r.id,
            teamId: dummyTeam[0].id,
            start: moment([2020, 0, 1]).toDate(),
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        });
        await queryInterface.bulkInsert(
          'TeamPlayerMemberships',
          teamMemberships,
          {
            transaction: t,
            ignoreDuplicates: true,
          }
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
        { name: dummyClubName },
        { transaction: t, cascade: true }
      );
      await queryInterface.bulkDelete(
        'Teams',
        { name: dummyTeamName },
        { transaction: t, cascade: true }
      );
      await queryInterface.bulkDelete(
        'Players',
        { lastName: 'dummy' },
        { transaction: t, cascade: true }
      );
    });
  },
};
