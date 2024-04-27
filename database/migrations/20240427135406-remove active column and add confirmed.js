/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.removeColumn(
          {
            tableName: 'ClubPlayerMemberships',
            schema: 'public',
          },
          'active',
          { transaction: t },
        );

        await queryInterface.addColumn(
          {
            tableName: 'ClubPlayerMemberships',
            schema: 'public',
          },
          'confirmed',
          {
            type: sequelize.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          { transaction: t },
        );

        // set all confirmed to true
        await queryInterface.sequelize.query(
          'UPDATE "ClubPlayerMemberships" SET confirmed = true',
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
        await queryInterface.addColumn(
          {
            tableName: 'ClubPlayerMemberships',
            schema: 'public',
          },
          'active',
          {
            type: sequelize.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          { transaction: t },
        );

        await queryInterface.removeColumn(
          {
            tableName: 'ClubPlayerMemberships',
            schema: 'public',
          },
          'confirmed',
          { transaction: t },
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
