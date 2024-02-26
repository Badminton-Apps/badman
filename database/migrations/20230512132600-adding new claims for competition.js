/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.changeColumn(
          { tableName: 'Claims', schema: 'security' },
          'type',
          {
            type: sequelize.DataTypes.TEXT,
          },
          { transaction: t },
        );

        await queryInterface.sequelize.query(
          'UPDATE "security"."Claims" SET "type" = LOWER("type");',
          { transaction: t },
        );

        // drop the old enum
        await queryInterface.sequelize.query('DROP TYPE "security"."enum_Claims_type";', {
          transaction: t,
        });

        await queryInterface.changeColumn(
          { tableName: 'Claims', schema: 'security' },
          'type',
          {
            type: sequelize.DataTypes.ENUM('global', 'club', 'team', 'competition', 'tournament'),
            allowNull: false,
          },
          { transaction: t },
        );

        // update the constraint Claims_name_category_key to also include type
        await queryInterface.sequelize.query(
          'ALTER TABLE "security"."Claims" DROP CONSTRAINT "Claims_name_category_key";',
          { transaction: t },
        );

        await queryInterface.sequelize.query(
          'ALTER TABLE "security"."Claims" ADD CONSTRAINT "Claims_name_category_type_key" UNIQUE ("name", "category", "type");',
          { transaction: t },
        );

        // add claims for tournament and competition
        await queryInterface.bulkInsert(
          { tableName: 'Claims', schema: 'security' },
          [
            // Global claims
            {
              name: 'view-any:enrollment-competition',
              description: 'View any enrollment',
              category: 'competitions',
              type: 'global',
            },
            {
              name: 'view-any:enrollment-tournament',
              description: 'View any enrollment',
              category: 'tournament',
              type: 'global',
            },

            // competition claims
            {
              name: 'view:enrollment-competition',
              description: 'View any enrollment',
              category: 'competitions',
              type: 'competition',
            },
            {
              name: 'view:enrollment-competition',
              description: 'View any enrollment',
              category: 'competitions',
              type: 'club',
            },

            // tournament claims
            {
              name: 'view:enrollment-tournament',
              description: 'View any enrollment',
              category: 'tournament',
              type: 'tournament',
            },
            {
              name: 'view:enrollment-tournament',
              description: 'View any enrollment',
              category: 'tournament',
              type: 'club',
            },
          ],
          { transaction: t },
        );
      } catch (err) {
        console.error('We errored with', err?.message ?? err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.changeColumn(
          { tableName: 'Claims', schema: 'security' },
          'type',
          {
            type: sequelize.DataTypes.TEXT,
          },
          { transaction: t },
        );

        await queryInterface.sequelize.query(
          'UPDATE "security"."Claims" SET "type" = UPPER("type");',
          { transaction: t },
        );

        // drop the old enum
        await queryInterface.sequelize.query('DROP TYPE "security"."enum_Claims_type";', {
          transaction: t,
        });

        await queryInterface.changeColumn(
          { tableName: 'Claims', schema: 'security' },
          'type',
          {
            type: sequelize.DataTypes.ENUM('GLOBAL', 'CLUB', 'TEAM'),
            allowNull: false,
          },
          { transaction: t },
        );

        // update the constraint Claims_name_category_key to also include type
        await queryInterface.sequelize.query(
          'ALTER TABLE "security"."Claims" DROP CONSTRAINT "Claims_name_category_type_key";',
          { transaction: t },
        );

        await queryInterface.sequelize.query(
          'ALTER TABLE "security"."Claims" ADD CONSTRAINT "Claims_name_category_key" UNIQUE ("name", "category");',
          { transaction: t },
        );

        await queryInterface.bulkDelete(
          { tableName: 'Claims', schema: 'security' },
          {
            name: [
              'view-any:enrollment-competition',
              'view-any:enrollment-tournament',
              'view:enrollment-competition',
              'view:enrollment-tournament',
            ],
          },
          { transaction: t },
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
