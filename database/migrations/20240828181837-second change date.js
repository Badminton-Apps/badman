/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.renameColumn(
          {
            schema: 'event',
            tableName: 'EventCompetitions',
          },
          'changeCloseDate',
          'changeCloseDatePeriod1',
          { transaction: t },
        );
        
        await queryInterface.renameColumn(
          {
            schema: 'event',
            tableName: 'EventCompetitions',
          },
          'changeCloseRequestDate',
          'changeCloseRequestDatePeriod1',
          { transaction: t },
        );
        
        await queryInterface.addColumn(
          {
            schema: 'event',
            tableName: 'EventCompetitions',
          },
          'changeCloseDatePeriod2',
          {
            type: Sequelize.DATE,
            defaultValue: null,
            allowNull: true,
          },
          { transaction: t },
        );

        await queryInterface.addColumn(
          {
            schema: 'event',
            tableName: 'EventCompetitions',
          },
          'changeCloseRequestDatePeriod2',
          {
            type: Sequelize.DATE,
            defaultValue: null,
            allowNull: true,
          },
          { transaction: t },
        );

      
      } catch (err) {
        console.error('We errored with', err?.message ?? err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.renameColumn(
          {
            schema: 'event',
            tableName: 'EventCompetitions',
          },
          'changeCloseDatePeriod1',
          'changeCloseDate',
          { transaction: t },
        );

        await queryInterface.renameColumn(
          {
            schema: 'event',
            tableName: 'EventCompetitions',
          },
          'changeCloseRequestDatePeriod1',
          'changeCloseRequestDate',
          { transaction: t },
        );

        await queryInterface.removeColumn(
          {
            schema: 'event',
            tableName: 'EventCompetitions',
          },
          'changeCloseDatePeriod2',
          { transaction: t },
        );

        await queryInterface.removeColumn(
          {
            schema: 'event',
            tableName: 'EventCompetitions',
          },
          'changeCloseRequestDatePeriod2',
          { transaction: t },
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
