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
          { transaction: t }
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
