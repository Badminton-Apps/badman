/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const claims = [
  {
    id: '78fcbbde-5c31-4348-9c52-8a8947e29547',
    name: 'edit:state',
    description: 'Edit state',
    category: 'state',
    type: 'GLOBAL',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // {
  //   id: '5b608cc7-a06d-4e3d-9965-b1452c95cec4',
  //   name: 'add:state',
  //   description: 'Adds state',
  //   category: 'state',
  //   type: 'GLOBAL',
  //   createdAt: new Date(),
  //   updatedAt: new Date(),
  // },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.addColumn(
          'Clubs',
          'state',
          {
            type: sequelize.DataTypes.STRING,
            allowNull: true,
          },
          { transaction: t },
        );

        await queryInterface.addColumn(
          'Clubs',
          'country',
          {
            type: sequelize.DataTypes.STRING,
            allowNull: true,
          },
          { transaction: t },
        );

        await queryInterface.addColumn(
          {
            tableName: 'EventCompetitions',
            schema: 'event',
          },
          'state',
          {
            type: sequelize.DataTypes.STRING,
            allowNull: true,
          },
          { transaction: t },
        );

        await queryInterface.addColumn(
          {
            tableName: 'EventCompetitions',
            schema: 'event',
          },
          'country',
          {
            type: sequelize.DataTypes.STRING,
            allowNull: true,
          },
          { transaction: t },
        );

        await queryInterface.addColumn(
          {
            tableName: 'EventTournaments',
            schema: 'event',
          },
          'state',
          {
            type: sequelize.DataTypes.STRING,
            allowNull: true,
          },
          { transaction: t },
        );

        await queryInterface.addColumn(
          {
            tableName: 'EventTournaments',
            schema: 'event',
          },
          'country',
          {
            type: sequelize.DataTypes.STRING,
            allowNull: true,
          },
          { transaction: t },
        );

        // Add 2 claims to the database
        await queryInterface.bulkInsert(
          {
            tableName: 'Claims',
            schema: 'security',
          },
          claims,
          {
            transaction: t,
          },
        );

        // update the clubs with the new state and country
        // the state is determined by the clubid code, the code should be 5 characters long
        // the first number of the clubId is the state given by the following list
        // 1 = BE-VAN
        // 2 = BE-VBR
        // 3 = BE-VOV
        // 4 = BE-VWV
        // 7 = BE-VLI

        await queryInterface.sequelize.query(
          `UPDATE "Clubs" SET "state" = 'BE-VAN', "country" = 'be' WHERE "clubId" > '10000' AND "clubId" < '20000'`,
          { transaction: t },
        );

        await queryInterface.sequelize.query(
          `UPDATE "Clubs" SET "state" = 'BE-VBR', "country" = 'be' WHERE "clubId" > '20000' AND "clubId" < '30000'`,
          { transaction: t },
        );

        await queryInterface.sequelize.query(
          `UPDATE "Clubs" SET "state" = 'BE-VOV', "country" = 'be' WHERE "clubId" > '30000' AND "clubId" < '40000'`,
          { transaction: t },
        );

        await queryInterface.sequelize.query(
          `UPDATE "Clubs" SET "state" = 'BE-VWV', "country" = 'be' WHERE "clubId" > '40000' AND "clubId" < '50000'`,
          { transaction: t },
        );

        await queryInterface.sequelize.query(
          `UPDATE "Clubs" SET "state" = 'BE-VLI', "country" = 'be' WHERE "clubId" > '70000' AND "clubId" < '80000'`,
          { transaction: t },
        );

        // update the eventCompetitions with the new state and country
        // the state is determined by the start name of the event
        // PBA Competitie = BE-VAN
        // VVBBC Competitie = BE-VBR
        // PBO Competitie = BE-VOV
        // WVBF Competitie = BE-VWV
        // Limburgse interclubcompetitie = BE-VLI

        await queryInterface.sequelize.query(
          `UPDATE "event"."EventCompetitions" SET "state" = 'BE-VAN', "country" = 'be', "type"= 'PROV' WHERE lower("name") LIKE lower('PBA Competitie %')`,
          { transaction: t },
        );

        await queryInterface.sequelize.query(
          `UPDATE "event"."EventCompetitions" SET "state" = 'BE-VBR', "country" = 'be', "type"= 'PROV' WHERE lower("name") LIKE lower('VVBBC Competitie %')`,
          { transaction: t },
        );

        await queryInterface.sequelize.query(
          `UPDATE "event"."EventCompetitions" SET "state" = 'BE-VOV', "country" = 'be', "type"= 'PROV' WHERE lower("name") LIKE lower('PBO Competitie %')`,
          { transaction: t },
        );

        await queryInterface.sequelize.query(
          `UPDATE "event"."EventCompetitions" SET "state" = 'BE-VWV', "country" = 'be', "type"= 'PROV' WHERE lower("name") LIKE lower('WVBF Competitie %')`,
          { transaction: t },
        );

        await queryInterface.sequelize.query(
          `UPDATE "event"."EventCompetitions" SET "state" = 'BE-VLI', "country" = 'be', "type"= 'PROV' WHERE lower("name") LIKE lower('Limburgse interclubcompetitie %')`,
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
        await queryInterface.removeColumn('Clubs', 'state', {
          transaction: t,
        });

        await queryInterface.removeColumn('Clubs', 'country', {
          transaction: t,
        });

        await queryInterface.removeColumn(
          {
            tableName: 'EventCompetitions',
            schema: 'event',
          },
          'state',
          { transaction: t },
        );

        await queryInterface.removeColumn(
          {
            tableName: 'EventCompetitions',
            schema: 'event',
          },
          'country',
          { transaction: t },
        );

        await queryInterface.removeColumn(
          {
            tableName: 'EventTournaments',
            schema: 'event',
          },
          'state',
          { transaction: t },
        );

        await queryInterface.removeColumn(
          {
            tableName: 'EventTournaments',
            schema: 'event',
          },
          'country',
          { transaction: t },
        );

        // Remove 2 claims from the database
        await queryInterface.bulkDelete(
          {
            tableName: 'Claims',
            schema: 'security',
          },
          {
            id: {
              [sequelize.Op.in]: claims.map((claim) => claim.id),
            },
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
