/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-console */
'use strict';
const jsonPlayers = require('./players.json');
const moment = require('moment');

const dummyClubName = 'dummy club';
const dummyTeamName = 'Mix and Double dummy team';

module.exports = {
  up: (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      const dbPrimarySystem = await queryInterface.rawSelect(
        {
          tableName: 'Systems',
          schema: 'ranking'
        },
        {
          where: {
            primary: true
          }
        },
        ['id']
      );

      const dummyClub = await queryInterface.bulkInsert(
        'Clubs',
        [
          {
            name: dummyClubName,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        { transaction: t, ignoreDuplicates: true, returning: ['id'] }
      );

      const dummyTeam = await queryInterface.bulkInsert(
        'Teams',
        [
          {
            name: dummyTeamName,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        { transaction: t, ignoreDuplicates: true, returning: ['id'] }
      );

      const players = [];
      const playersRanking = [];

      jsonPlayers.map(p => {
        const { places, ...player } = p;
        players.push({
          ...player,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        playersRanking.push(places);
      });

      const dummyPlayers = await queryInterface.bulkInsert('Players', players, {
        transaction: t,
        ignoreDuplicates: true,
        returning: ['id']
      });

      for (const [i, playerRanking] of playersRanking.entries()) {
        playersRanking[i] = playerRanking.map(r => {
          return {
            ...r,
            PlayerId: dummyPlayers[i].id,
            SystemId: dbPrimarySystem
          };
        });
      }

      const dbPlaces = await queryInterface.bulkInsert(
        {
          tableName: 'Places',
          schema: 'ranking'
        },
        playersRanking.flat(),
        {
          transaction: t
        }
      );

      const clubMemberships = dummyPlayers.map(r => {
        return {
          playerId: r.id,
          clubId: dummyClub[0].id,
          start: moment([2020, 0, 1]).toDate(),
          active: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      });
      await queryInterface.bulkInsert('ClubMemberships', clubMemberships, {
        transaction: t,
        ignoreDuplicates: true
      });

      const teamMemberships = dummyPlayers.map(r => {
        return {
          playerId: r.id,
          teamId: dummyTeam[0].id,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      });
      await queryInterface.bulkInsert('TeamMemberships', teamMemberships, {
        transaction: t,
        ignoreDuplicates: true
      });
    });
  },

  down: (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      const club = await queryInterface.rawSelect(
        'Clubs',
        {
          where: {
            name: dummyClubName
          }
        },
        ['id']
      );
      const team = await queryInterface.rawSelect(
        'Teams',
        {
          where: {
            name: dummyTeamName
          }
        },
        ['id']
      );

      await queryInterface.bulkDelete(
        'Clubs',
        { name: dummyClubName },
        { transaction: t }
      );
      await queryInterface.bulkDelete(
        'Teams',
        { name: dummyTeamName },
        { transaction: t }
      );
      await queryInterface.bulkDelete(
        'Players',
        { lastName: 'dummy' },
        { transaction: t }
      );

      if (club != null) {
        await queryInterface.bulkDelete(
          'ClubMemberships',
          {
            clubId: club
          },
          { transaction: t }
        );
      }
      if (team != null) {
        await queryInterface.bulkDelete(
          'TeamMemberships',
          {
            teamId: team
          },
          { transaction: t }
        );
      }
    });
  }
};
