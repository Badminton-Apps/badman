/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.sequelize.query(
          `update  "event"."SubEventCompetitions"
            set "visualCode" = null
            where id in(select "SubEventCompetitions".id from "event"."SubEventCompetitions"
                      inner join "event"."EventCompetitions" on "EventCompetitions".id = "SubEventCompetitions"."eventId"
                      where "event"."EventCompetitions"."startYear" = 2022)`,
          { transaction: t },
        );

        // fixing team with wrong name
        await queryInterface.sequelize.query(
          `update  "Teams"
            set "name" = 'BaZo 1G'
            where "name" = 'Zoutleeuw 1G'`,
          { transaction: t },
        );

        // fixing subevents with wrong id
        await queryInterface.sequelize.query(
          `update  "event"."Entries"
            set "subEventId" = '0a50a16c-dee4-480d-9d8a-33000c3968ec'
            where "subEventId" = '46257fa6-f634-421f-b1e1-b6298722b8c4'`,
          { transaction: t },
        );
        await queryInterface.sequelize.query(
          `update  "event"."Entries"
            set "subEventId" = '556f0423-1155-4418-aa72-0e36fe9fe08a'
            where "subEventId" = '4533ec6d-ec85-47a7-903a-cd3ba04f5e17'`,
          { transaction: t },
        );
        await queryInterface.sequelize.query(
          `update  "event"."Entries"
            set "subEventId" = '807e0d1e-0d51-4c1a-a6db-e4292a5509f9'
            where "subEventId" = '9d366bfb-309f-4d2c-834e-d17bba469b94'`,
          { transaction: t },
        );

        // Just disable all
        await queryInterface.sequelize.query(
          `update  "event"."EventCompetitions"
            set "allowEnlisting" = false`,
          { transaction: t },
        );

        // fixing club with wrong name
        await queryInterface.sequelize.query(
          `update  "Clubs"
            set "name" = 'Spinners'
            where "name" = ' Spinners'`,
          { transaction: t },
        );
        await queryInterface.sequelize.query(
          `update  "Teams"
          set "name" = 'Spinners 1G'
          where "name" = ' Spinners 1G'`,
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
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
