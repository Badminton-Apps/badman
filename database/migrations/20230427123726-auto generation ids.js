/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const tables = [
  { schema: 'event', table: 'Courts' },
  { schema: 'event', table: 'SubEventTournaments' },
  { schema: 'event', table: 'EncounterChanges' },
  { schema: 'event', table: 'Entries' },
  { schema: 'event', table: 'Standings' },
  { schema: 'event', table: 'SubEventCompetitions' },
  { schema: 'event', table: 'DrawTournaments' },
  { schema: 'event', table: 'EncounterChangeDates' },
  { schema: 'event', table: 'Locations' },
  { schema: 'event', table: 'DrawCompetitions' },
  { schema: 'event', table: 'EncounterCompetitions' },
  { schema: 'event', table: 'Games' },
  { schema: 'event', table: 'EventCompetitions' },
  { schema: 'event', table: 'Availabilities' },
  { schema: 'event', table: 'EventTournaments' },
  { schema: 'personal', table: 'Notifications' },
  { schema: 'personal', table: 'Assemblies' },
  { schema: 'personal', table: 'Settings' },
  { schema: 'public', table: 'Clubs' },
  { schema: 'public', table: 'ClubPlayerMemberships' },
  { schema: 'public', table: 'Faqs' },
  { schema: 'public', table: 'Comments' },
  { schema: 'public', table: 'RequestLinks' },
  { schema: 'public', table: 'TeamPlayerMemberships' },
  { schema: 'public', table: 'Players' },
  { schema: 'public', table: 'Teams' },
  { schema: 'public', table: 'Clubs' },
  { schema: 'ranking', table: 'RankingSystems' },
  { schema: 'ranking', table: 'RankingGroups' },
  { schema: 'ranking', table: 'RankingLastPlaces' },
  { schema: 'ranking', table: 'RankingPlaces' },
  { schema: 'ranking', table: 'RankingPoints' },
  { schema: 'security', table: 'Roles' },
  { schema: 'security', table: 'Claims' },
];
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      // convert all ids to auto generate on null

      for (const table of tables) {
        try {
          console.log(`Starting migration for ${table.schema}.${table.table}`);
          await queryInterface.sequelize.query(
            `ALTER TABLE "${table.schema}"."${table.table}" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();`,
            {
              transaction: t,
            },
          );

          await queryInterface.sequelize.query(
            `ALTER TABLE "${table.schema}"."${table.table}" ALTER COLUMN "createdAt" SET DEFAULT now();`,
            {
              transaction: t,
            },
          );

          await queryInterface.sequelize.query(
            `ALTER TABLE "${table.schema}"."${table.table}" ALTER COLUMN "updatedAt" SET DEFAULT now();`,
            {
              transaction: t,
            },
          );

          console.log(`Finished migration for ${table.schema}.${table.table}`);
        } catch (err) {
          console.error('We errored with', err?.message ?? err);
          t.rollback();
        }
      }

      try {
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
