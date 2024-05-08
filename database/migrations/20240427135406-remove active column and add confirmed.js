/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const { type } = require('node:os');

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

        await queryInterface.bulkInsert(
          {
            tableName: 'Claims',
            schema: 'security',
          },
          [
            {
              name: 'enlist-any-event:team',
              description: 'Enlist team in any event',
              category: 'team',
              type: 'global',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          { transaction: t },
        );

        // rename description of claim with name 'enlist-any:team'
        await queryInterface.sequelize.query(
          `UPDATE "security"."Claims" SET description = 'Enlist any team in to competition' WHERE name = 'enlist-any:team'`,
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

        // remove enlist-any-event:team claim
        await queryInterface.sequelize.query(
          `DELETE FROM "security"."Claims" WHERE name = 'enlist-any:team'`,
          { transaction: t },
        );
        
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
