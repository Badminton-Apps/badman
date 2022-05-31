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
        const dbPrimarySystem = await queryInterface.rawSelect(
          {
            tableName: 'Systems',
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
              name: dummyClubName,
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

        const dbPlaces = await queryInterface.bulkInsert(
          {
            tableName: 'Places',
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
        await queryInterface.bulkInsert('ClubPlayerMemberships', clubMemberships, {
          transaction: t,
          ignoreDuplicates: true,
        });

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
        await queryInterface.bulkInsert('TeamPlayerMemberships', teamMemberships, {
          transaction: t,
          ignoreDuplicates: true,
        });
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },

  down: (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      const club = await queryInterface.rawSelect(
        'Clubs',
        {
          where: {
            name: dummyClubName,
          },
        },
        ['id']
      );
      const team = await queryInterface.rawSelect(
        'Teams',
        {
          where: {
            name: dummyTeamName,
          },
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
          'ClubPlayerMemberships',
          {
            clubId: club,
          },
          { transaction: t }
        );
      }
      if (team != null) {
        await queryInterface.bulkDelete(
          'TeamMemberships',
          {
            teamId: team,
          },
          { transaction: t }
        );
      }
    });
  },
};
