/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // fetch all players
        const players = await queryInterface.sequelize.query(
          `SELECT * FROM "Players" where "memberId" is not null and "memberId" != '' and "firstName" is not null and "lastName" is not null`,
          { type: queryInterface.sequelize.QueryTypes.SELECT, transaction: t },
        );

        // find if any players have the same memberId
        const playersWithSameMemberId = players.filter((player) => {
          return players.filter((p) => p.memberId === player.memberId).length > 1;
        });

        const rankingLastPlaces = await queryInterface.sequelize.query(
          `SELECT * from "ranking"."RankingLastPlaces" WHERE "playerId" IN (:ids)`,
          {
            replacements: { ids: playersWithSameMemberId.map((p) => p.id) },
            type: queryInterface.sequelize.QueryTypes.SELECT,
            transaction: t,
          },
        );

        console.log(`Fixing ${playersWithSameMemberId.length} players with same memberId`);

        // merge all players with the same memberId
        for (const player of playersWithSameMemberId) {
          const same = players.filter((p) => p.memberId === player.memberId);

          // if competition is true, use that player
          let playerToKeep = same.find((p) => p.competition === true);

          // if no competition player, use the player with a sub
          if (!playerToKeep) {
            playerToKeep = same.find((p) => p.sub === true);
          }

          // if no sub player, use the player with the lowest ranking in single, double or mixed
          if (!playerToKeep) {
            // find all rankingplaces for any player with the same memberId
            const rankingPlaces = rankingLastPlaces.filter((r) =>
              some?.map((p) => p.id).includes(r.playerId),
            );

            if (rankingPlaces.length === 0) {
              console.log('No ranking places', player);
            } else {
              // find the lowest ranking place
              const lowestRankingPlace = rankingPlaces.reduce((acc, cur) => {
                if (cur.single < acc.single) {
                  return cur;
                }

                if (cur.double < acc.double) {
                  return cur;
                }

                if (cur.mixed < acc.mixed) {
                  return cur;
                }

                return acc;
              });
              // find the player with the lowest ranking place
              playerToKeep = same.find((p) => p.id === lowestRankingPlace.playerId);
            }
          }

          // if no player to keep, use the first player
          if (!playerToKeep) {
            console.log('No player to keep', player);
            playerToKeep = same[0];
          }

          // remove all players with the same memberId except the player to keep
          for (const p of same) {
            if (p.id !== playerToKeep.id) {
              // update all games where the player has played
              await queryInterface.sequelize.query(
                `UPDATE "event"."GamePlayerMemberships" SET "playerId" = '${playerToKeep.id}' WHERE "playerId" = '${p.id}'`,
                {
                  type: queryInterface.sequelize.QueryTypes.UPDATE,
                  transaction: t,
                },
              );

              // Update all "event"."EventEntries" where the player has played
              await queryInterface.sequelize.query(
                `UPDATE "event"."Entries" SET "player1Id" = '${playerToKeep.id}' WHERE "player1Id" = '${p.id}' `,
                {
                  type: queryInterface.sequelize.QueryTypes.UPDATE,
                  transaction: t,
                },
              );
              // Update all "event"."EventEntries" where the player has played
              await queryInterface.sequelize.query(
                `UPDATE "event"."Entries" SET "player2Id" = '${playerToKeep.id}' WHERE "player2Id" = '${p.id}' `,
                {
                  type: queryInterface.sequelize.QueryTypes.UPDATE,
                  transaction: t,
                },
              );

              // update all "ClubPlayerMemberships" where the player has played
              await queryInterface.sequelize.query(
                `UPDATE "ClubPlayerMemberships" SET "playerId" = '${playerToKeep.id}' WHERE "playerId" = '${p.id}'`,
                {
                  type: queryInterface.sequelize.QueryTypes.UPDATE,
                  transaction: t,
                },
              );

              // Update comments
              await queryInterface.sequelize.query(
                `UPDATE "Comments" SET "playerId" = '${playerToKeep.id}' WHERE "playerId" = '${p.id}'`,
                {
                  type: queryInterface.sequelize.QueryTypes.UPDATE,
                  transaction: t,
                },
              );

              // delete all rankingplaces
              await queryInterface.sequelize.query(
                `DELETE FROM "ranking"."RankingLastPlaces" WHERE "playerId" = '${p.id}'`,
                {
                  type: queryInterface.sequelize.QueryTypes.DELETE,
                  transaction: t,
                },
              );

              await queryInterface.sequelize.query(
                `DELETE FROM "ranking"."RankingPlaces" WHERE "playerId" = '${p.id}'`,
                {
                  type: queryInterface.sequelize.QueryTypes.DELETE,
                  transaction: t,
                },
              );

              // delete all game points
              await queryInterface.sequelize.query(
                `DELETE FROM "ranking"."RankingPoints" WHERE "playerId" = '${p.id}'`,
                {
                  type: queryInterface.sequelize.QueryTypes.DELETE,
                  transaction: t,
                },
              );

              await queryInterface.sequelize.query(`DELETE FROM "Players" WHERE "id" = '${p.id}'`, {
                type: queryInterface.sequelize.QueryTypes.DELETE,
                transaction: t,
              });
            }
          }
        }

        console.log('Fixing player names');
        // make sure all players's firstname and lastname are in pascal case
        for (const player of players) {
          const firstName = toTitleCase(player.firstName?.toLowerCase());
          const lastName = toTitleCase(player.lastName?.toLowerCase());

          if (firstName !== player.firstName || lastName !== player.lastName) {
            await queryInterface.sequelize.query(
              `UPDATE "Players" SET "firstName" = :firstName, "lastName" = :lastName WHERE "id" = '${player.id}'`,
              {
                type: queryInterface.sequelize.QueryTypes.UPDATE,
                transaction: t,
                replacements: {
                  firstName,
                  lastName,
                },
              },
            );
          }
        }
      } catch (err) {
        console.error('We errored with', err?.message ?? err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};

function toTitleCase(str) {
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}
