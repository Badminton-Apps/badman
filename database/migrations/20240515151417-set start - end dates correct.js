/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const { type } = require('node:os');
const moment = require('moment');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // delete all with no startdate
        await queryInterface.sequelize.query(
          `DELETE FROM "ClubPlayerMemberships" where "start" is null`,
          { transaction: t },
        );

        // fetch all ClubPlayerMemberships
        const [memberships] = await queryInterface.sequelize.query(
          `SELECT * FROM "ClubPlayerMemberships" where "membershipType" = 'NORMAL' and start < '2024-06-01'`,
          { transaction: t },
        );

        //  group by player_id
        const groupedMemberships = memberships.reduce((acc, membership) => {
          const playerId = membership.playerId;
          if (!acc[playerId]) {
            acc[playerId] = [];
          }
          acc[playerId].push({
            ...membership,
            start: moment(membership.start),
            end: membership.end == null ? null : moment(membership.end),
          });

          return acc;
        }, {});

        for (const playerId in groupedMemberships) {
          // sort playerMemberships so we process the oldest one first
          const playerMemberships = groupedMemberships[playerId].sort(
            (a, b) => new Date(a.start) - new Date(b.start),
          );

          if (playerMemberships.length <= 1) {
            continue;
          }

          let clubOrder = [];
          let finalOrder = [];
          let currentClub = null;
          let currentIndex = -1;

          for (let i = 0; i < playerMemberships.length; i++) {
            const membership = playerMemberships[i];

            if (currentClub == membership.clubId) {
              clubOrder[currentIndex].push(membership);
            } else {
              clubOrder.push([membership]);
              currentIndex = clubOrder.length - 1;
              currentClub = membership.clubId;
            }
          }

          for (let i = 0; i < clubOrder.length; i++) {
            const clubMembership = clubOrder[i];
            const startDate = moment.min(clubMembership.map((r) => r.start));
            const endDate = moment.max(
              clubMembership.filter((r) => r.end != null).map((r) => r.end),
            );
            let currentClub = false;

            // if we are the most recent one, check if there is one with end = null
            if (i == clubOrder.length - 1) {
              if (clubMembership?.find((c) => c.end == null)) {
                currentClub = true;
              }
            }

            // the end date of last membership can't be bigger then the start of our current one
            if (i >= 1) {
              const prevMembershipEnd = moment(finalOrder[i - 1].end);
              if (
                startDate.isSame(prevMembershipEnd.end, 'year') ||
                startDate.isBefore(prevMembershipEnd.end, 'day')
              ) {
                finalOrder[i - 1].end = startDate.toISOString();
              }
            }

            finalOrder.push({
              ...clubMembership[0],
              start: startDate.toISOString(),
              end: currentClub ? null : endDate.toISOString(),
            });
          }
          
          await queryInterface.sequelize.query(
            `DELETE FROM "ClubPlayerMemberships" where "playerId" = '${playerMemberships[0].playerId}'`,
            { transaction: t },
          );

          await queryInterface.bulkInsert(
            {
              tableName: 'ClubPlayerMemberships',
              schema: 'public',
            },
            finalOrder,
            { transaction: t },
          );
        }
      } catch (err) {
        console.error('We errored with', err?.message ?? err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
