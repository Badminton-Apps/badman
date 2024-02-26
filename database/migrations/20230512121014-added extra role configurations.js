/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // remove foreign key constraint
        await queryInterface.removeConstraint(
          { tableName: 'Roles', schema: 'security' },
          'Roles_clubId_fkey',
          { transaction: t },
        );

        // change the clubId column of roles table to be linkId
        await queryInterface.renameColumn(
          { tableName: 'Roles', schema: 'security' },
          'clubId',
          'linkId',
          { transaction: t },
        );

        // change the type column of roles table to be linkType
        await queryInterface.renameColumn(
          { tableName: 'Roles', schema: 'security' },
          'type',
          'linkType',
          { transaction: t },
        );

        // update all type values to be club
        await queryInterface.sequelize.query(
          'UPDATE "security"."Roles" SET "linkType" = \'CLUB\';',
          { transaction: t },
        );

        await queryInterface.changeColumn(
          { tableName: 'Roles', schema: 'security' },
          'linkType',
          {
            type: sequelize.DataTypes.TEXT,
          },
          { transaction: t },
        );

        // lowercase the linkType column
        await queryInterface.sequelize.query(
          'UPDATE "security"."Roles" SET "linkType" = LOWER("linkType");',
          { transaction: t },
        );

        await queryInterface.changeColumn(
          { tableName: 'Roles', schema: 'security' },
          'linkType',
          {
            type: sequelize.DataTypes.ENUM('global', 'club', 'team', 'competition', 'tournament'),
            allowNull: false,
          },
          { transaction: t },
        );

        await queryInterface.sequelize.query('DROP TYPE "security"."enum_Roles_type";', {
          transaction: t,
        });
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
          { tableName: 'Roles', schema: 'security' },
          'linkType',
          {
            type: sequelize.DataTypes.TEXT,
          },
          { transaction: t },
        );

        // lowercase the linkType column
        await queryInterface.sequelize.query(
          'UPDATE "security"."Roles" SET "linkType" = UPPER("linkType");',
          { transaction: t },
        );

        // change the linkType column of roles table to be type
        await queryInterface.renameColumn(
          { tableName: 'Roles', schema: 'security' },
          'linkType',
          'type',
          { transaction: t },
        );

        await queryInterface.changeColumn(
          { tableName: 'Roles', schema: 'security' },
          'type',
          {
            type: sequelize.DataTypes.ENUM('GLOBAL', 'CLUB', 'TEAM'),
            allowNull: false,
          },
          { transaction: t },
        );

        // change the linkId column of roles table to be clubId
        await queryInterface.renameColumn(
          { tableName: 'Roles', schema: 'security' },
          'linkId',
          'clubId',
          { transaction: t },
        );

        // add foreign key constraint
        await queryInterface.addConstraint(
          { tableName: 'Roles', schema: 'security' },
          {
            fields: ['clubId'],
            type: 'foreign key',
            references: {
              table: 'Clubs',
              field: 'id',
            },
            onDelete: 'cascade',
            onUpdate: 'cascade',
            name: 'Roles_clubId_fkey',
            transaction: t,
          },
        );

        await queryInterface.sequelize.query('DROP TYPE "security"."enum_Roles_linkType";', {
          transaction: t,
        });
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
