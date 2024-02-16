/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // Add column "date" to entries table
        await queryInterface.addColumn(
          {
            tableName: 'ClubPlayerMemberships',
            schema: 'public',
          },
          'membershipType',
          {
            type: sequelize.DataTypes.ENUM('NORMAL', 'LOAN'),
            defaultValue: 'NORMAL',
            allowNull: false,
          },
          {
            transaction: t,
          },
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
        await queryInterface.removeColumn(
          {
            tableName: 'ClubPlayerMemberships',
            schema: 'public',
          },
          'membershipType',
          {
            transaction: t,
          },
        );

        // delete enum
        await queryInterface.sequelize.query(
          `DROP TYPE "enum_ClubPlayerMemberships_membershipType"`,
          { transaction: t },
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
