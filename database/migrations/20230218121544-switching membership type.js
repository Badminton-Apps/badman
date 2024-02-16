/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        console.log('Adding column');

        // Add column "date" to entries table
        await queryInterface.addColumn(
          {
            tableName: 'TeamPlayerMemberships',
            schema: 'public',
          },
          'membershipType',
          {
            type: sequelize.DataTypes.ENUM('REGULAR', 'BACKUP'),
            defaultValue: 'REGULAR',
            allowNull: false,
          },
          {
            transaction: t,
          },
        );

        await queryInterface.removeColumn(
          {
            tableName: 'TeamPlayerMemberships',
            schema: 'public',
          },
          'base',
          {
            transaction: t,
          },
        );

        console.log('Done');
      } catch (err) {
        console.error('We errored with', err?.message ?? err);

        t.rollback();
      }
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.removeColumn(
          {
            tableName: 'TeamPlayerMemberships',
            schema: 'public',
          },
          'membershipType',
          {
            transaction: t,
          },
        );

        // delete enum
        await queryInterface.sequelize.query(
          `DROP TYPE "enum_TeamPlayerMemberships_membershipType"`,
          { transaction: t },
        );

        await queryInterface.addColumn(
          {
            tableName: 'TeamPlayerMemberships',
            schema: 'public',
          },
          'base',
          {
            type: sequelize.DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false,
          },
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
