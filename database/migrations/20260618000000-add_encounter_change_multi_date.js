"use strict";

/** @type {import('sequelize-cli').Migration} */

module.exports = {
  async up(queryInterface, _Sequelize) {
    return queryInterface.sequelize.transaction(async (t) => {
      // Step 1: Create ENUM types explicitly in the event schema
      await queryInterface.sequelize.query(
        `CREATE TYPE event."enum_EncounterChanges_lastActionBy" AS ENUM ('HOME', 'AWAY')`,
        { transaction: t }
      );
      await queryInterface.sequelize.query(
        `CREATE TYPE event."enum_EncounterChangeDates_proposedBy" AS ENUM ('HOME', 'AWAY')`,
        { transaction: t }
      );
      await queryInterface.sequelize.query(
        `CREATE TYPE event."enum_EncounterChangeDates_status" AS ENUM (
          'PENDING', 'TENTATIVELY_ACCEPTED', 'ACCEPTED', 'REJECTED', 'RESOLVED'
        )`,
        { transaction: t }
      );

      // Step 2: Add nullable columns
      await queryInterface.sequelize.query(
        `ALTER TABLE event."EncounterChanges"
           ADD COLUMN "lastActionBy" event."enum_EncounterChanges_lastActionBy",
           ADD COLUMN "lastActionAt" TIMESTAMPTZ`,
        { transaction: t }
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE event."EncounterChangeDates"
           ADD COLUMN "proposedBy" event."enum_EncounterChangeDates_proposedBy",
           ADD COLUMN "status"     event."enum_EncounterChangeDates_status"`,
        { transaction: t }
      );

      // Step 3: Backfill proposedBy — availabilityAway IS NULL means HOME proposed
      await queryInterface.sequelize.query(
        `UPDATE event."EncounterChangeDates"
         SET "proposedBy" = CASE
           WHEN "availabilityAway" IS NULL THEN 'HOME'::event."enum_EncounterChangeDates_proposedBy"
           ELSE 'AWAY'::event."enum_EncounterChangeDates_proposedBy"
         END`,
        { transaction: t }
      );

      // Step 4: Backfill status — only for definitively known states.
      // Dates on non-accepted change requests are left NULL (historical/no longer relevant).
      await queryInterface.sequelize.query(
        `UPDATE event."EncounterChangeDates" d
         SET "status" = CASE
           WHEN d.selected = true AND ec.accepted = true
             THEN 'ACCEPTED'::event."enum_EncounterChangeDates_status"
           WHEN d.selected IS NOT true AND ec.accepted = true
             THEN 'RESOLVED'::event."enum_EncounterChangeDates_status"
         END
         FROM event."EncounterChanges" ec
         WHERE d."encounterChangeId" = ec.id
           AND ec.accepted = true`,
        { transaction: t }
      );

      // Step 5: Backfill lastActionBy / lastActionAt from newest date per change
      // Cast via TEXT because proposedBy and lastActionBy are different enum types
      await queryInterface.sequelize.query(
        `UPDATE event."EncounterChanges" ec
         SET
           "lastActionBy" = latest."proposedBy"::TEXT::event."enum_EncounterChanges_lastActionBy",
           "lastActionAt" = latest."createdAt"
         FROM (
           SELECT DISTINCT ON ("encounterChangeId")
             "encounterChangeId",
             "proposedBy",
             "createdAt"
           FROM event."EncounterChangeDates"
           ORDER BY "encounterChangeId", "createdAt" DESC
         ) AS latest
         WHERE ec.id = latest."encounterChangeId"`,
        { transaction: t }
      );

      // Fallback for EncounterChanges with no dates: use updatedAt / HOME
      await queryInterface.sequelize.query(
        `UPDATE event."EncounterChanges"
         SET "lastActionBy" = 'HOME'::event."enum_EncounterChanges_lastActionBy",
             "lastActionAt" = "updatedAt"
         WHERE "lastActionBy" IS NULL`,
        { transaction: t }
      );

      // Step 6: Add NOT NULL constraints on EncounterChanges only
      // (proposedBy and status on EncounterChangeDates remain nullable for historical rows)
      await queryInterface.sequelize.query(
        `ALTER TABLE event."EncounterChanges"
           ALTER COLUMN "lastActionBy" SET NOT NULL,
           ALTER COLUMN "lastActionAt" SET NOT NULL`,
        { transaction: t }
      );

      // Step 7: Drop legacy columns
      await queryInterface.sequelize.query(
        `ALTER TABLE event."EncounterChanges"     DROP COLUMN accepted`,
        { transaction: t }
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE event."EncounterChangeDates" DROP COLUMN selected`,
        { transaction: t }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (t) => {
      // Restore legacy columns
      await queryInterface.addColumn(
        { tableName: "EncounterChanges", schema: "event" },
        "accepted",
        { type: Sequelize.DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        { transaction: t }
      );
      await queryInterface.addColumn(
        { tableName: "EncounterChangeDates", schema: "event" },
        "selected",
        { type: Sequelize.DataTypes.BOOLEAN, allowNull: true },
        { transaction: t }
      );

      // Restore accepted from status
      await queryInterface.sequelize.query(
        `UPDATE event."EncounterChanges" ec
         SET accepted = true
         WHERE EXISTS (
           SELECT 1 FROM event."EncounterChangeDates" d
           WHERE d."encounterChangeId" = ec.id AND d.status = 'ACCEPTED'
         )`,
        { transaction: t }
      );

      // Restore selected from status
      await queryInterface.sequelize.query(
        `UPDATE event."EncounterChangeDates"
         SET selected = true
         WHERE status = 'ACCEPTED'`,
        { transaction: t }
      );

      // Drop new columns (implicitly drops column-level type references)
      await queryInterface.sequelize.query(
        `ALTER TABLE event."EncounterChanges"
           DROP COLUMN "lastActionBy",
           DROP COLUMN "lastActionAt"`,
        { transaction: t }
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE event."EncounterChangeDates"
           DROP COLUMN "proposedBy",
           DROP COLUMN "status"`,
        { transaction: t }
      );

      // Drop ENUM types
      await queryInterface.sequelize.query(
        `DROP TYPE IF EXISTS event."enum_EncounterChanges_lastActionBy"`,
        { transaction: t }
      );
      await queryInterface.sequelize.query(
        `DROP TYPE IF EXISTS event."enum_EncounterChangeDates_proposedBy"`,
        { transaction: t }
      );
      await queryInterface.sequelize.query(
        `DROP TYPE IF EXISTS event."enum_EncounterChangeDates_status"`,
        { transaction: t }
      );
    });
  },
};
