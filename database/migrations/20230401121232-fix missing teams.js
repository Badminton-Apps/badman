/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // get all teams
        const teams = await queryInterface.sequelize.query(`SELECT * FROM "Teams"`, {
          type: queryInterface.sequelize.QueryTypes.SELECT,
          transaction: t,
        });

        // get all entries
        const entries = await queryInterface.sequelize.query(
          `SELECT * FROM "event"."Entries" where "teamId" is not null;`,
          { type: queryInterface.sequelize.QueryTypes.SELECT, transaction: t },
        );

        // get al linked events
        const events = await queryInterface.sequelize.query(
          `SELECT "event"."EventCompetitions"."startYear",  "event"."SubEventCompetitions".id as "subEventId" FROM "event"."EventCompetitions" INNER JOIN "event"."SubEventCompetitions" ON "SubEventCompetitions"."eventId" = "EventCompetitions".id`,
          { type: queryInterface.sequelize.QueryTypes.SELECT, transaction: t },
        );

        // find all entries where the team has multiple entries
        const entriesWithMultipleTeams = entries.filter((entry) => {
          return entries.filter((e) => e.teamId === entry.teamId).length > 1;
        });

        console.log(`Found ${entriesWithMultipleTeams.length} entries with multiple teams.`);

        const changedTeams = [];
        const changedEntries = [];

        // create a new team for each entry
        for (const entry of entriesWithMultipleTeams) {
          const team = teams.find((team) => team.id === entry.teamId);
          const entryYear = events.find(
            (event) => event.subEventId === entry.subEventId,
          )?.startYear;

          if (!team) {
            console.log(
              `Could not find team for entry ${entry.id} with team ${entry.teamId} and subEvent ${entry.subEventId}.`,
            );
            continue;
          }

          if (!entryYear) {
            console.log(
              `Could not find year for entry ${entry.id} with team ${entry.teamId} and subEvent ${entry.subEventId}.`,
            );
            continue;
          }

          // if team's season is the same as the entry's season, we don't need to change anything
          if (team.season === entryYear) {
            continue;
          }

          // remove the year from the slug of the team
          const slug = team.slug.replace(/-\d{4}$/, '') + '-' + entryYear.toString();

          //  check if any team with the same slug exists
          const existingTeam = teams.find((team) => team.slug === slug);
          const alreadyCreatedTeam = changedTeams.find((team) => team.slug === slug);

          // if a team with the same slug was already created, we don't need to create a new team
          if (alreadyCreatedTeam) {
            continue;
          }

          // if a team with the same slug exists, we don't need to create a new team
          if (existingTeam) {
            changedEntries.push({
              ...entry,
              teamId: existingTeam.id,
            });
            continue;
          }

          const newTeamId = uuidv4();
          changedTeams.push({
            ...team,
            id: newTeamId,
            slug,
            link: team.id,
            season: entryYear,
          });

          changedEntries.push({
            ...entry,
            teamId: newTeamId,
          });
        }

        if (changedTeams.length > 0) {
          console.log(`Created ${changedTeams.length} new teams.`);

          // create the new teams
          await queryInterface.bulkInsert({ tableName: 'Teams', schema: 'public' }, changedTeams, {
            transaction: t,
          });
        }

        if (changedEntries.length > 0) {
          console.log(`Updated ${changedEntries.length} entries.`);
          // update the entries
          for (const entry of changedEntries) {
            await queryInterface.sequelize.query(
              `UPDATE "event"."Entries" SET "teamId" = :teamId WHERE "id" = :id`,
              {
                replacements: {
                  teamId: entry.teamId,
                  id: entry.id,
                },
                transaction: t,
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
