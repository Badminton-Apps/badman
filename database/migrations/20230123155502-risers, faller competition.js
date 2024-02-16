/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      //  Add sequelize columns to define risers and fallers

      // drop encounter accepted column
      await queryInterface.addColumn(
        { tableName: 'DrawCompetitions', schema: 'event' },
        'risers',
        {
          type: sequelize.DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        { transaction: t },
      );

      await queryInterface.addColumn(
        { tableName: 'DrawCompetitions', schema: 'event' },
        'fallers',
        {
          type: sequelize.DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        { transaction: t },
      );

      await queryInterface.addColumn(
        { tableName: 'DrawTournaments', schema: 'event' },
        'risers',
        {
          type: sequelize.DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        { transaction: t },
      );

      await queryInterface.addColumn(
        { tableName: 'DrawTournaments', schema: 'event' },
        'fallers',
        {
          type: sequelize.DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        { transaction: t },
      );

      // drop encounter accepted column
      await queryInterface.addColumn(
        { tableName: 'Standings', schema: 'event' },
        'riser',
        {
          type: sequelize.DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        { transaction: t },
      );

      await queryInterface.addColumn(
        { tableName: 'Standings', schema: 'event' },
        'faller',
        {
          type: sequelize.DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
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
      await queryInterface.removeColumn(
        { tableName: 'DrawCompetitions', schema: 'event' },
        'risers',
        { transaction: t },
      );

      await queryInterface.removeColumn(
        { tableName: 'DrawCompetitions', schema: 'event' },
        'fallers',
        { transaction: t },
      );
      await queryInterface.removeColumn(
        { tableName: 'DrawTournaments', schema: 'event' },
        'risers',
        { transaction: t },
      );

      await queryInterface.removeColumn(
        { tableName: 'DrawTournaments', schema: 'event' },
        'fallers',
        { transaction: t },
      );

      await queryInterface.removeColumn({ tableName: 'Standings', schema: 'event' }, 'riser', {
        transaction: t,
      });

      await queryInterface.removeColumn({ tableName: 'Standings', schema: 'event' }, 'faller', {
        transaction: t,
      });

      try {
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
