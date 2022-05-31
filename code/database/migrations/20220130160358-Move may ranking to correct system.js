/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

module.exports = {
  up: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        const [systems] = await queryInterface.sequelize.query(
          `select * from ranking."Systems" `,
          { transaction: t }
        );

        if (systems.length > 0) {
          const primSystem = systems.find((s) => s.name == 'BBF Rating').id;
          const current = systems.find(
            (s) => s.name == 'BV 75/30 FINAL SYSTEM'
          ).id;

          await queryInterface.sequelize.query(
            `UPDATE ranking."Places" set "SystemId" = '${primSystem}' where "SystemId" = '${current}' and "rankingDate" = '2021-05-15 00:00:00+02'`,
            { transaction: t }
          );
        }
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        const [systems] = await queryInterface.sequelize.query(
          `select * from ranking."Systems" `,
          { transaction: t }
        );
        if (systems.length > 0) {
          const primSystem = systems.find((s) => s.name == 'BBF Rating').id;
          const current = systems.find(
            (s) => s.name == 'BV 75/30 FINAL SYSTEM'
          ).id;

          await queryInterface.sequelize.query(
            `UPDATE ranking."Places" set "SystemId" = '${current}' where "SystemId" = '${primSystem}' and "rankingDate" = '2021-05-15 00:00:00+02'`,
            { transaction: t }
          );
        }
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
