/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-console */
'use strict';
const jsonPlayers = require('./players.json');
const moment = require('moment');

// import uuidv4
const { v4: uuidv4 } = require('uuid');

const dummyClubName = 'dummy club';
const dummyTeamName = 'Mix and Double dummy team';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        const [admin] = await queryInterface.bulkInsert(
          'Players',
          [
            {
              id: uuidv4(),
              lastName: 'super',
              firstName: 'admin',
              memberId: '000',
              gender: 'M',
            },
          ],
          {
            transaction: t,
            ignoreDuplicates: true,
            returning: ['id'],
          }
        );


        const [adminRoles] = await queryInterface.sequelize.query(
          `select id from "security"."Claims" where "type" = 'GLOBAL'`,
          { transaction: t }
        );


        await queryInterface.bulkInsert(
          { tableName: 'PlayerClaimMemberships', schema: 'security' },
          adminRoles.map((admin) => {
            return {
              playerId: admin['id'],
              claimId: personal[0],
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          }),
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
        'Players',
        {
          lastName: 'super',
          firstName: 'admin',
        },
        { transaction: t }
      );
    });
  },
};
