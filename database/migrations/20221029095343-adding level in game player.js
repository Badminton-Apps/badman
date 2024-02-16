/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // drop encounter accepted column
        await queryInterface.addColumn(
          { tableName: 'GamePlayerMemberships', schema: 'event' },
          'single',
          {
            type: sequelize.DataTypes.INTEGER,
            allowNull: true,
          },
          { transaction: t },
        );

        await queryInterface.addColumn(
          { tableName: 'GamePlayerMemberships', schema: 'event' },
          'double',
          {
            type: sequelize.DataTypes.INTEGER,
            allowNull: true,
          },
          { transaction: t },
        );

        await queryInterface.addColumn(
          { tableName: 'GamePlayerMemberships', schema: 'event' },
          'mix',
          {
            type: sequelize.DataTypes.INTEGER,
            allowNull: true,
          },
          { transaction: t },
        );

        await queryInterface.addColumn(
          { tableName: 'GamePlayerMemberships', schema: 'event' },
          'systemId',
          {
            type: sequelize.DataTypes.STRING,
            allowNull: true,
            references: {
              model: {
                tableName: 'RankingSystems',
                schema: 'ranking',
              },
              key: 'id',
            },
          },
          { transaction: t },
        );

        console.log('Migrating data');

        const [systems] = await queryInterface.sequelize.query(
          `select * from "ranking"."RankingSystems" where "primary" = true`,
          {
            transaction: t,
          },
        );

        const primarySystem = systems[0];

        const [games] = await queryInterface.sequelize.query(
          `select * from "event"."Games" where "playedAt" > '2020-09-01'`,
          {
            transaction: t,
          },
        );

        console.log(`Found ${games.length} games`);
        const queries = [];
        for (const game of games) {
          const [players] = await queryInterface.sequelize.query(
            `select * from "event"."GamePlayerMemberships" where "gameId" = '${game.id}'`,
            {
              transaction: t,
            },
          );

          // print percentage of progress every 500 games
          const index = games.indexOf(game);
          if (index % 500 === 0) {
            console.log(
              `Migrating ${index}/${games.length} (${((index / games.length) * 100).toFixed(2)}%)`,
            );
          }

          for (const player of players) {
            const level = await queryInterface.sequelize.query(
              `select * from "ranking"."RankingPlaces" where "playerId" = '${
                player.playerId
              }' and "rankingDate" <= '${game.playedAt.toISOString()}' and "systemId"='${
                primarySystem.id
              }' order by "rankingDate" desc limit 1`,
              {
                transaction: t,
              },
            );

            if (level[0].length > 0) {
              queries.push(
                `update "event"."GamePlayerMemberships" set "single" = ${level[0][0].single}, "double" = ${level[0][0].double}, "mix" = ${level[0][0].mix}, "systemId" = '${primarySystem.id}' where "gameId" = '${game.id}' and "playerId" = '${player.playerId}';`,
                {
                  transaction: t,
                },
              );
            }
          }
        }

        await queryInterface.sequelize.query(queries.join(''), {
          transaction: t,
        });
      } catch (err) {
        console.error('We errored with', err?.message ?? err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // expand encounter with scores entered and scores accepted columns
        await queryInterface.removeColumn(
          { tableName: 'GamePlayerMemberships', schema: 'event' },
          'single',
          { transaction: t },
        );
        await queryInterface.removeColumn(
          { tableName: 'GamePlayerMemberships', schema: 'event' },
          'double',
          { transaction: t },
        );

        await queryInterface.removeColumn(
          { tableName: 'GamePlayerMemberships', schema: 'event' },
          'mix',
          { transaction: t },
        );

        await queryInterface.removeColumn(
          { tableName: 'GamePlayerMemberships', schema: 'event' },
          'systemId',
          { transaction: t },
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
