/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        console.log('Adding column');

        // Add column "date" to entries table
        await queryInterface.addColumn(
          {
            tableName: 'Entries',
            schema: 'event',
          },
          'date',
          {
            type: sequelize.DataTypes.DATE,
            allowNull: true,
          },
          {
            transaction: t,
          },
        );

        console.log('Getting all Competition Events');
        // Get all Competition Events from the database with CompetitionSubEvents
        const competitionEvents = await queryInterface.sequelize.query(
          `SELECT "SubEventCompetitions"."id", "startYear" FROM "event"."EventCompetitions" INNER JOIN "event"."SubEventCompetitions" ON "SubEventCompetitions"."eventId" = "EventCompetitions".id WHERE "EventCompetitions"."startYear" IS NOT NULL`,
          {
            type: queryInterface.sequelize.QueryTypes.SELECT,
            transaction: t,
          },
        );

        console.log(`Updating entries with ${competitionEvents.length} Competition Events`);
        // Store the year of the Competition Event in the date column of the entry
        for (const competitionEvent of competitionEvents) {
          // update progress every 50 entries
          if (competitionEvents.indexOf(competitionEvent) % 50 === 0) {
            console.log(
              `Progress: %${
                (competitionEvents.indexOf(competitionEvent) / competitionEvents.length) * 100
              }`,
            );
          }
          await queryInterface.sequelize.query(
            `UPDATE "event"."Entries" SET "date" = '${competitionEvent.startYear}-01-01' WHERE "subEventId" = '${competitionEvent.id}'`,
            {
              type: queryInterface.sequelize.QueryTypes.UPDATE,
              transaction: t,
            },
          );
        }

        console.log('Getting all Tournament Events');
        // Get all Tournaments Events from the database with TournamentSubEvents
        const tournamentEvents = await queryInterface.sequelize.query(
          `SELECT "SubEventTournaments"."id", "firstDay" FROM "event"."EventTournaments" INNER JOIN "event"."SubEventTournaments" ON "SubEventTournaments"."eventId" = "EventTournaments"."id" WHERE "EventTournaments"."firstDay" IS NOT NULL`,
          {
            type: queryInterface.sequelize.QueryTypes.SELECT,
            transaction: t,
          },
        );

        console.log(`Updating entries with ${tournamentEvents.length} Tournament Events`);
        // Store the firstDay of the Tournament Event in the date column of the entry
        for (const tournamentEvent of tournamentEvents) {
          // update progress every 50 entries
          if (tournamentEvents.indexOf(tournamentEvent) % 50 === 0) {
            console.log(
              `Progress: %${
                (tournamentEvents.indexOf(tournamentEvent) / tournamentEvents.length) * 100
              }`,
            );
          }

          await queryInterface.sequelize.query(
            `UPDATE "event"."Entries" SET "date" = '${tournamentEvent.firstDay?.toISOString()}' WHERE "subEventId" = '${
              tournamentEvent.id
            }'`,
            {
              type: queryInterface.sequelize.QueryTypes.UPDATE,
              transaction: t,
            },
          );
        }

        console.log('Done');
      } catch (err) {
        console.error('We errored with', err?.message ?? err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.removeColumn(
        {
          tableName: 'Entries',
          schema: 'event',
        },
        'date',
        {
          transaction: t,
        },
      );

      try {
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
