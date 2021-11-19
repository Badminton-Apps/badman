'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      try {
        await queryInterface.addColumn(
          {
            tableName: 'EventCompetitions',
            schema: 'event'
          },
          'visualCode',
          {
            type: sequelize.DataTypes.STRING,
            allowNull: true
          },
          { transaction: t }
        );

        await queryInterface.addColumn(
          {
            tableName: 'EventTournaments',
            schema: 'event'
          },
          'visualCode',
          {
            type: sequelize.DataTypes.STRING,
            allowNull: true
          },
          { transaction: t }
        );

        await queryInterface.sequelize.query(
          `
          UPDATE "event"."EventCompetitions" 
          SET "visualCode" = '13C19A72-56DE-41C2-900F-763A2EAB37C3' 
          WHERE "name" = 'PBO competitie 2021-2022';
          `,
          { transaction: t }
        );

        await queryInterface.sequelize.query(
          `
          UPDATE "event"."EventCompetitions" 
          SET "visualCode" = '39653A34-0315-494B-8634-80CC5A4327A4' 
          WHERE "name" = 'Limburgse interclubcompetitie 2021-2022';
          `,
          { transaction: t }
        );

        await queryInterface.sequelize.query(
          `
          UPDATE "event"."EventCompetitions" 
          SET "visualCode" = '343A6D01-7373-405B-9427-CB56B07F8CCD' 
          WHERE "name" = 'PBA competitie 2021-2022';
          `,
          { transaction: t }
        );

        await queryInterface.sequelize.query(
          `
          UPDATE "event"."EventCompetitions" 
          SET "visualCode" = '36DA478C-B036-47A6-BAAA-D2F7995F7599' 
          WHERE "name" = 'VVBBC interclubcompetitie 2021-2022';
          `,
          { transaction: t }
        );

        await queryInterface.sequelize.query(
          `
          UPDATE "event"."EventCompetitions" 
          SET "visualCode" = 'BD406AC5-DB29-4CD7-B8A6-5EDF9A9BCD37' 
          WHERE "name" = 'Vlaamse interclubcompetitie 2021-2022';
          `,
          { transaction: t }
        );

        await queryInterface.sequelize.query(
          `
          UPDATE "event"."EventCompetitions" 
          SET "visualCode" = '9BBF45C4-4826-4D4A-9FCA-18189693800E' 
          WHERE "name" = 'WVBF Competitie 2021-2022';
          `,
          { transaction: t }
        );

      } catch (err) {
        console.error(err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeColumn(
        {
          tableName: 'EventCompetitions',
          schema: 'event'
        },
        'visualCode',
        { transaction: t }
      );

      await queryInterface.removeColumn(
        {
          tableName: 'EventTournaments',
          schema: 'event'
        },
        'visualCode',
        { transaction: t }
      );
    });
  }
};
