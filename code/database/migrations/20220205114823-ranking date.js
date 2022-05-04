/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.addColumn(
          {
            tableName: 'EventCompetitions',
            schema: 'event',
          },
          'usedRankingUnit',
          {
            type: sequelize.ENUM('months', 'weeks', 'days'),
            defaultValue: 'months',
          },
          { transaction: t }
        );

        await queryInterface.addColumn(
          {
            tableName: 'EventCompetitions',
            schema: 'event',
          },
          'usedRankingAmount',
          {
            type: sequelize.INTEGER,
            defaultValue: 5,
          },
          { transaction: t }
        );

        await queryInterface.addColumn(
          {
            tableName: 'EventTournaments',
            schema: 'event',
          },
          'usedRankingUnit',
          {
            type: sequelize.ENUM('months', 'weeks', 'days'),
            defaultValue: 'months',
          },
          { transaction: t }
        );

        await queryInterface.addColumn(
          {
            tableName: 'EventTournaments',
            schema: 'event',
          },
          'usedRankingAmount',
          {
            type: sequelize.INTEGER,
            defaultValue: 5,
          },
          { transaction: t }
        );

        // Delete wrong rankings
        await queryInterface.sequelize.query(
          `delete from ranking."Places" where "rankingDate" = '2021-05-14T22:00:00.000Z' `,
          { transaction: t }
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.removeColumn(
          {
            tableName: 'EventCompetitions',
            schema: 'event',
          },
          'usedRankingUnit',
          { transaction: t }
        );

        await queryInterface.removeColumn(
          {
            tableName: 'EventCompetitions',
            schema: 'event',
          },
          'usedRankingAmount',
          { transaction: t }
        );

        await queryInterface.removeColumn(
          {
            tableName: 'EventTournaments',
            schema: 'event',
          },
          'usedRankingUnit',
          { transaction: t }
        );

        await queryInterface.removeColumn(
          {
            tableName: 'EventTournaments',
            schema: 'event',
          },
          'usedRankingAmount',
          { transaction: t }
        );

        await queryInterface.sequelize.query(
          'DROP TYPE IF EXISTS event."enum_EventCompetitions_usedRankingUnit";',
          {
            transaction: t,
          }
        );

        await queryInterface.sequelize.query(
          'DROP TYPE IF EXISTS event."enum_EventTournaments_usedRankingUnit";',
          {
            transaction: t,
          }
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
