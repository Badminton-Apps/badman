/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-console */
'use strict';
const jsonPlayers = require('./players.json');
const moment = require('moment');

// import uuidv4
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.bulkDelete(
          'Players',
          {
            lastName: 'super',
            firstName: 'admin',
          },
          { transaction: t, cascade: true }
        );

        const [admin] = await queryInterface.bulkInsert(
          'Players',
          [
            {
              id: uuidv4(),
              lastName: 'super',
              firstName: 'admin',
              memberId: '000',
              gender: 'M',
              slug: 'admin',
              createdAt: new Date(),
              updatedAt: new Date(),
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
          adminRoles.map((role) => {
            return {
              playerId: admin['id'],
              claimId: role['id'],
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
