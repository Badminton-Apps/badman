"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.sequelize.query("CREATE SCHEMA IF NOT EXISTS twizzit", {
          transaction: t,
        });

        // sync_run — one row per backfill execution
        await queryInterface.createTable(
          { tableName: "sync_run", schema: "twizzit" },
          {
            id: {
              type: queryInterface.sequelize.constructor.DataTypes.UUID,
              primaryKey: true,
              allowNull: false,
              defaultValue: queryInterface.sequelize.constructor.literal("gen_random_uuid()"),
            },
            status: {
              type: queryInterface.sequelize.constructor.DataTypes.TEXT,
              allowNull: false,
              defaultValue: "pending",
            },
            organization_id: {
              type: queryInterface.sequelize.constructor.DataTypes.BIGINT,
              allowNull: true,
            },
            started_at: {
              type: queryInterface.sequelize.constructor.DataTypes.DATE,
              allowNull: true,
            },
            finished_at: {
              type: queryInterface.sequelize.constructor.DataTypes.DATE,
              allowNull: true,
            },
            page_size: {
              type: queryInterface.sequelize.constructor.DataTypes.INTEGER,
              allowNull: true,
            },
            inter_page_delay_ms: {
              type: queryInterface.sequelize.constructor.DataTypes.INTEGER,
              allowNull: true,
            },
            counts: {
              type: queryInterface.sequelize.constructor.DataTypes.JSONB,
              allowNull: true,
            },
            error_summary: {
              type: queryInterface.sequelize.constructor.DataTypes.TEXT,
              allowNull: true,
            },
            createdAt: {
              type: queryInterface.sequelize.constructor.DataTypes.DATE,
              allowNull: false,
              defaultValue: queryInterface.sequelize.constructor.literal("NOW()"),
            },
            updatedAt: {
              type: queryInterface.sequelize.constructor.DataTypes.DATE,
              allowNull: false,
              defaultValue: queryInterface.sequelize.constructor.literal("NOW()"),
            },
          },
          { transaction: t }
        );

        // sync_checkpoint — per-entity resume pointer
        await queryInterface.createTable(
          { tableName: "sync_checkpoint", schema: "twizzit" },
          {
            id: {
              type: queryInterface.sequelize.constructor.DataTypes.UUID,
              primaryKey: true,
              allowNull: false,
              defaultValue: queryInterface.sequelize.constructor.literal("gen_random_uuid()"),
            },
            sync_run_id: {
              type: queryInterface.sequelize.constructor.DataTypes.UUID,
              allowNull: false,
            },
            entity_type: {
              type: queryInterface.sequelize.constructor.DataTypes.TEXT,
              allowNull: false,
            },
            last_offset: {
              type: queryInterface.sequelize.constructor.DataTypes.INTEGER,
              allowNull: false,
              defaultValue: 0,
            },
            page_size: {
              type: queryInterface.sequelize.constructor.DataTypes.INTEGER,
              allowNull: false,
              defaultValue: 100,
            },
            records_written: {
              type: queryInterface.sequelize.constructor.DataTypes.BIGINT,
              allowNull: false,
              defaultValue: 0,
            },
            updatedAt: {
              type: queryInterface.sequelize.constructor.DataTypes.DATE,
              allowNull: false,
              defaultValue: queryInterface.sequelize.constructor.literal("NOW()"),
            },
          },
          { transaction: t }
        );

        await queryInterface.addIndex(
          { tableName: "sync_checkpoint", schema: "twizzit" },
          ["sync_run_id", "entity_type"],
          { unique: true, transaction: t, name: "uq_sync_checkpoint_run_entity" }
        );

        // shadow_organization
        await queryInterface.createTable(
          { tableName: "shadow_organization", schema: "twizzit" },
          {
            twizzit_id: {
              type: queryInterface.sequelize.constructor.DataTypes.BIGINT,
              primaryKey: true,
              allowNull: false,
            },
            name: {
              type: queryInterface.sequelize.constructor.DataTypes.TEXT,
              allowNull: true,
            },
            payload: {
              type: queryInterface.sequelize.constructor.DataTypes.JSONB,
              allowNull: false,
            },
            sync_run_id: {
              type: queryInterface.sequelize.constructor.DataTypes.UUID,
              allowNull: false,
            },
            fetched_at: {
              type: queryInterface.sequelize.constructor.DataTypes.DATE,
              allowNull: false,
              defaultValue: queryInterface.sequelize.constructor.literal("NOW()"),
            },
          },
          { transaction: t }
        );

        // shadow_extra_field
        await queryInterface.createTable(
          { tableName: "shadow_extra_field", schema: "twizzit" },
          {
            twizzit_id: {
              type: queryInterface.sequelize.constructor.DataTypes.BIGINT,
              primaryKey: true,
              allowNull: false,
            },
            payload: {
              type: queryInterface.sequelize.constructor.DataTypes.JSONB,
              allowNull: false,
            },
            sync_run_id: {
              type: queryInterface.sequelize.constructor.DataTypes.UUID,
              allowNull: false,
            },
            fetched_at: {
              type: queryInterface.sequelize.constructor.DataTypes.DATE,
              allowNull: false,
              defaultValue: queryInterface.sequelize.constructor.literal("NOW()"),
            },
          },
          { transaction: t }
        );

        // shadow_membership_type
        await queryInterface.createTable(
          { tableName: "shadow_membership_type", schema: "twizzit" },
          {
            twizzit_id: {
              type: queryInterface.sequelize.constructor.DataTypes.BIGINT,
              primaryKey: true,
              allowNull: false,
            },
            payload: {
              type: queryInterface.sequelize.constructor.DataTypes.JSONB,
              allowNull: false,
            },
            sync_run_id: {
              type: queryInterface.sequelize.constructor.DataTypes.UUID,
              allowNull: false,
            },
            fetched_at: {
              type: queryInterface.sequelize.constructor.DataTypes.DATE,
              allowNull: false,
              defaultValue: queryInterface.sequelize.constructor.literal("NOW()"),
            },
          },
          { transaction: t }
        );

        // shadow_membership
        await queryInterface.createTable(
          { tableName: "shadow_membership", schema: "twizzit" },
          {
            twizzit_id: {
              type: queryInterface.sequelize.constructor.DataTypes.BIGINT,
              primaryKey: true,
              allowNull: false,
            },
            contact_id: {
              type: queryInterface.sequelize.constructor.DataTypes.BIGINT,
              allowNull: true,
            },
            club_id: {
              type: queryInterface.sequelize.constructor.DataTypes.BIGINT,
              allowNull: true,
            },
            membership_type_id: {
              type: queryInterface.sequelize.constructor.DataTypes.BIGINT,
              allowNull: true,
            },
            season_id: {
              type: queryInterface.sequelize.constructor.DataTypes.BIGINT,
              allowNull: true,
            },
            start_date: {
              type: queryInterface.sequelize.constructor.DataTypes.DATEONLY,
              allowNull: true,
            },
            end_date: {
              type: queryInterface.sequelize.constructor.DataTypes.DATEONLY,
              allowNull: true,
            },
            payload: {
              type: queryInterface.sequelize.constructor.DataTypes.JSONB,
              allowNull: false,
            },
            sync_run_id: {
              type: queryInterface.sequelize.constructor.DataTypes.UUID,
              allowNull: false,
            },
            fetched_at: {
              type: queryInterface.sequelize.constructor.DataTypes.DATE,
              allowNull: false,
              defaultValue: queryInterface.sequelize.constructor.literal("NOW()"),
            },
          },
          { transaction: t }
        );

        await queryInterface.addIndex(
          { tableName: "shadow_membership", schema: "twizzit" },
          ["contact_id"],
          { transaction: t, name: "idx_shadow_membership_contact_id" }
        );
        await queryInterface.addIndex(
          { tableName: "shadow_membership", schema: "twizzit" },
          ["club_id"],
          { transaction: t, name: "idx_shadow_membership_club_id" }
        );
        await queryInterface.addIndex(
          { tableName: "shadow_membership", schema: "twizzit" },
          ["membership_type_id"],
          { transaction: t, name: "idx_shadow_membership_type_id" }
        );

        // shadow_contact
        await queryInterface.createTable(
          { tableName: "shadow_contact", schema: "twizzit" },
          {
            twizzit_id: {
              type: queryInterface.sequelize.constructor.DataTypes.BIGINT,
              primaryKey: true,
              allowNull: false,
            },
            first_name: {
              type: queryInterface.sequelize.constructor.DataTypes.TEXT,
              allowNull: true,
            },
            last_name: {
              type: queryInterface.sequelize.constructor.DataTypes.TEXT,
              allowNull: true,
            },
            date_of_birth: {
              type: queryInterface.sequelize.constructor.DataTypes.DATEONLY,
              allowNull: true,
            },
            member_id: {
              type: queryInterface.sequelize.constructor.DataTypes.TEXT,
              allowNull: true,
            },
            gender: {
              type: queryInterface.sequelize.constructor.DataTypes.TEXT,
              allowNull: true,
            },
            payload: {
              type: queryInterface.sequelize.constructor.DataTypes.JSONB,
              allowNull: false,
            },
            sync_run_id: {
              type: queryInterface.sequelize.constructor.DataTypes.UUID,
              allowNull: false,
            },
            fetched_at: {
              type: queryInterface.sequelize.constructor.DataTypes.DATE,
              allowNull: false,
              defaultValue: queryInterface.sequelize.constructor.literal("NOW()"),
            },
          },
          { transaction: t }
        );

        await queryInterface.sequelize.query(
          `CREATE INDEX idx_shadow_contact_natural_key
             ON twizzit.shadow_contact (lower(first_name), lower(last_name), date_of_birth)`,
          { transaction: t }
        );
        await queryInterface.sequelize.query(
          `CREATE INDEX idx_shadow_contact_member_id
             ON twizzit.shadow_contact (member_id)
             WHERE member_id IS NOT NULL`,
          { transaction: t }
        );
      } catch (err) {
        console.error("Migration error", err);
        await t.rollback();
        throw err;
      }
    });
  },

  down: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        const tables = [
          "shadow_contact",
          "shadow_membership",
          "shadow_membership_type",
          "shadow_extra_field",
          "shadow_organization",
          "sync_checkpoint",
          "sync_run",
        ];
        for (const table of tables) {
          await queryInterface.dropTable({ tableName: table, schema: "twizzit" }, { transaction: t });
        }
        await queryInterface.sequelize.query("DROP SCHEMA IF EXISTS twizzit CASCADE", {
          transaction: t,
        });
      } catch (err) {
        console.error("Migration rollback error", err);
        await t.rollback();
        throw err;
      }
    });
  },
};
