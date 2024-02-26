/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const otherForeignKeys = [
  {
    source_schema: 'event',
    source_table: 'Entries',
    source_column: 'subEventId',
  },
  {
    source_schema: 'event',
    source_table: 'Entries',
    source_column: 'drawId',
  },
  {
    source_schema: 'event',
    source_table: 'Games',
    source_column: 'linkId',
  },
  {
    source_schema: 'public',
    source_table: 'Comments',
    source_column: 'linkId',
  },
  {
    source_schema: 'personal',
    source_table: 'Notifications',
    source_column: 'linkId',
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        console.log('Starting migration');

        console.log('Removing unique constraint');
        await queryInterface.sequelize.query(
          `ALTER TABLE "public"."Teams" DROP CONSTRAINT "teams_unique_constraint";`,
          {
            transaction: t,
          },
        );

        // for (const foreignKeyInfo of otherForeignKeys) {
        //   const query = `ALTER TABLE "${foreignKeyInfo.source_schema}"."${foreignKeyInfo.source_table}" ALTER COLUMN "${foreignKeyInfo.source_column}" TYPE uuid USING "${foreignKeyInfo.source_column}"::uuid;`;
        //   console.log(`${query}`);
        // }

        console.log('Adding year column');
        await queryInterface.addColumn(
          {
            tableName: 'Teams',
            schema: 'public',
          },
          'year',
          {
            type: sequelize.DataTypes.INTEGER,
            defaultValue: 2022,
            allowNull: false,
          },
          {
            transaction: t,
          },
        );

        // delet all entries without a entry type
        console.log('Deleting entries without a type');
        await queryInterface.sequelize.query(
          `DELETE FROM "event"."Entries" WHERE "entryType" IS NULL;`,
          {
            transaction: t,
          },
        );

        // for all events where startyear is >= 2021 delete entries without meta
        console.log('Deleting entries without meta');
        await queryInterface.sequelize.query(
          `DELETE FROM "event"."Entries" WHERE "entryType" = 'competition' and "subEventId" IN (SELECT "id" FROM "event"."SubEventCompetitions" WHERE "eventId" IN (SELECT "id" FROM "event"."EventCompetitions" WHERE "startYear" >= 2021)) and "meta" IS NULL;`,
          {
            transaction: t,
          },
        );

        // update all teams and slug to use the year 2022
        console.log('Updating all teams to use year 2022');
        await queryInterface.sequelize.query(
          `UPDATE "public"."Teams" SET "year" = 2022, "slug" = CONCAT("slug", '-2022');`,
          {
            transaction: t,
          },
        );

        // remove all inactive teams
        console.log('Removing all inactive teams');
        await queryInterface.sequelize.query(
          `DELETE FROM "public"."Teams" WHERE "active" = false;`,
          {
            transaction: t,
          },
        );

        // remove active fields
        console.log('Removing active field');
        await queryInterface.removeColumn(
          {
            tableName: 'Teams',
            schema: 'public',
          },
          'active',
          {
            transaction: t,
          },
        );

        // Create a link UUID column to link different years of the same team
        console.log('Adding link column');
        await queryInterface.addColumn(
          {
            tableName: 'Teams',
            schema: 'public',
          },
          'link',
          {
            type: sequelize.DataTypes.UUID,
            defaultValue: sequelize.DataTypes.UUIDV4,
          },
          {
            transaction: t,
          },
        );

        // insert a unique link for each team
        console.log('Inserting unique link for each team');
        await queryInterface.sequelize.query(
          `UPDATE "public"."Teams" SET "link" = gen_random_uuid();`,

          {
            transaction: t,
          },
        );

        // Make link non null
        console.log('Making link non null');
        await queryInterface.sequelize.query(
          `ALTER TABLE "public"."Teams" ALTER COLUMN "link" SET NOT NULL;`,
          {
            transaction: t,
          },
        );

        // Update the unique constraint to use the year, clubid, teamnumber and type
        console.log('Updating unique constraint');
        await queryInterface.sequelize.query(
          `ALTER TABLE "public"."Teams" ADD CONSTRAINT "teams_unique_constraint" UNIQUE ("year", "clubId", "teamNumber", "type");`,
          {
            transaction: t,
          },
        );

        console.log('Committing');
      } catch (err) {
        console.error('We errored with', err?.message ?? err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        console.log('Starting migration');

        console.log('Removing unique constraint');
        await queryInterface.sequelize.query(
          `ALTER TABLE "public"."Teams" DROP CONSTRAINT "teams_unique_constraint";`,
          {
            transaction: t,
          },
        );

        await queryInterface.removeColumn(
          {
            tableName: 'Teams',
            schema: 'public',
          },
          'year',
          {
            transaction: t,
          },
        );

        await queryInterface.addColumn(
          {
            tableName: 'Teams',
            schema: 'public',
          },
          'active',
          {
            type: sequelize.DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false,
          },
          {
            transaction: t,
          },
        );

        await queryInterface.sequelize.query(
          `ALTER TABLE "public"."Teams" ADD CONSTRAINT "teams_unique_constraint" UNIQUE ("clubId", "teamNumber", "type");`,
          {
            transaction: t,
          },
        );

        await queryInterface.removeColumn(
          {
            tableName: 'Teams',
            schema: 'public',
          },
          'link',
          {
            transaction: t,
          },
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
