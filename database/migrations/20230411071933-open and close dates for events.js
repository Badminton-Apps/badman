/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      console.log('Removing allowEnlisting column');

      await queryInterface.removeColumn(
        {
          tableName: 'EventCompetitions',
          schema: 'event',
        },
        'allowEnlisting',
        { transaction: t },
      );

      await queryInterface.removeColumn(
        {
          tableName: 'EventTournaments',
          schema: 'event',
        },
        'allowEnlisting',
        { transaction: t },
      );

      console.log('Adding open and close dates for events');

      await queryInterface.addColumn(
        {
          tableName: 'EventCompetitions',
          schema: 'event',
        },
        'openDate',
        {
          type: sequelize.DataTypes.DATE,
          allowNull: true,
        },
        { transaction: t },
      );

      await queryInterface.addColumn(
        {
          tableName: 'EventCompetitions',
          schema: 'event',
        },
        'closeDate',
        {
          type: sequelize.DataTypes.DATE,
          allowNull: true,
        },
        { transaction: t },
      );

      await queryInterface.addColumn(
        {
          tableName: 'EventTournaments',
          schema: 'event',
        },
        'openDate',
        {
          type: sequelize.DataTypes.DATE,
          allowNull: true,
        },
        { transaction: t },
      );

      await queryInterface.addColumn(
        {
          tableName: 'EventTournaments',
          schema: 'event',
        },
        'closeDate',
        {
          type: sequelize.DataTypes.DATE,
          allowNull: true,
        },
        { transaction: t },
      );

      try {
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
            tableName: 'EventCompetitions',
            schema: 'event',
          },
          'openDate',
          { transaction: t },
        );

        await queryInterface.removeColumn(
          {
            tableName: 'EventCompetitions',
            schema: 'event',
          },
          'closeDate',
          { transaction: t },
        );

        await queryInterface.removeColumn(
          {
            tableName: 'EventTournaments',
            schema: 'event',
          },
          'openDate',
          { transaction: t },
        );

        await queryInterface.removeColumn(
          {
            tableName: 'EventTournaments',
            schema: 'event',
          },
          'closeDate',
          { transaction: t },
        );

        // Add allowEnlisting column
        await queryInterface.addColumn(
          {
            tableName: 'EventCompetitions',
            schema: 'event',
          },
          'allowEnlisting',
          {
            type: sequelize.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          { transaction: t },
        );

        await queryInterface.addColumn(
          {
            tableName: 'EventTournaments',
            schema: 'event',
          },
          'allowEnlisting',
          {
            type: sequelize.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
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
