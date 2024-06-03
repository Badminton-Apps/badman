/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // add the contact email column to the Clubs table
        await queryInterface.addColumn(
          {
            tableName: 'Clubs',
            schema: 'public',
          },
          'contactCompetition',
          {
            type: sequelize.DataTypes.STRING,
            allowNull: true,
          },
          { transaction: t },
        );

        // copy over the email from log table
        const [results] = await queryInterface.sequelize.query(
          `select meta->>'clubId' AS club_id, meta->>'email' as email from "system"."Logs"  where "action" =  'EnrollmentSubmitted'`,
          { transaction: t },
        );

        for (const { club_id, email } of results) {
          await queryInterface.sequelize.query(
            `UPDATE "Clubs" SET "contactCompetition" = '${email}' WHERE "id" = '${club_id}';`,
            { transaction: t },
          );
        }


      } catch (err) {
        console.error('We errored with', err?.message ?? err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // remove the contact email column from the Clubs table
        await queryInterface.removeColumn(
          {
            tableName: 'Clubs',
            schema: 'public',
          },
          'contactCompetition',
          { transaction: t },
        );

      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
