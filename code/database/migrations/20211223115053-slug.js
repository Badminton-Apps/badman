/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.addColumn(
          {
            tableName: 'Players',
            schema: 'public',
          },
          'slug',
          { type: sequelize.DataTypes.STRING, unique: true, after: 'lastName' },
          { transaction: t }
        );
        await queryInterface.addColumn(
          {
            tableName: 'Teams',
            schema: 'public',
          },
          'slug',
          { type: sequelize.DataTypes.STRING, unique: true, after: 'name' },
          { transaction: t }
        );

        await queryInterface.addColumn(
          {
            tableName: 'Clubs',
            schema: 'public',
          },
          'slug',
          { type: sequelize.DataTypes.STRING, unique: true, after: 'name' },
          { transaction: t }
        );

        await queryInterface.addColumn(
          {
            tableName: 'EventCompetitions',
            schema: 'event',
          },
          'slug',
          { type: sequelize.DataTypes.STRING, unique: true, after: 'name' },
          { transaction: t }
        );

        await queryInterface.addColumn(
          {
            tableName: 'EventTournaments',
            schema: 'event',
          },
          'slug',
          { type: sequelize.DataTypes.STRING, unique: true, after: 'name' },
          { transaction: t }
        );

        
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.removeColumn(
          {
            tableName: 'Players',
            schema: 'public',
          },
          'slug',
          { transaction: t }
        );
        await queryInterface.removeColumn(
          {
            tableName: 'Teams',
            schema: 'public',
          },
          'slug',
          { transaction: t }
        );

        await queryInterface.removeColumn(
          {
            tableName: 'Clubs',
            schema: 'public',
          },
          'slug',
          { transaction: t }
        );

        await queryInterface.removeColumn(
          {
            tableName: 'EventCompetitions',
            schema: 'event',
          },
          'slug',
          { transaction: t }
        );

        await queryInterface.removeColumn(
          {
            tableName: 'EventTournaments',
            schema: 'event',
          },
          'slug',
          { transaction: t }
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
