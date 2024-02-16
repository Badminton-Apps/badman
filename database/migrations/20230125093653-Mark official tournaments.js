'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, sequelize) {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.addColumn(
        { tableName: 'EventCompetitions', schema: 'event' },
        'official',
        {
          type: sequelize.DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        { transaction: t },
      );

      await queryInterface.addColumn(
        { tableName: 'EventTournaments', schema: 'event' },
        'official',
        {
          type: sequelize.DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        { transaction: t },
      );

      // Mark all competitions where name contains "PBO competitie 20", "Vlaamse interclubcompetitie 20", "Victor League 20", "WVBF Competitie 20", "LFBB Interclubs 20", "Limburgse interclubcompetitie 20", "PBA competitie 20" or "VVBBC interclubcompetitie 20" as official
      await queryInterface.sequelize.query(
        `UPDATE "event"."EventCompetitions" SET "official" = true WHERE "name" LIKE '%PBO competitie 20%' OR "name" LIKE '%Vlaamse interclubcompetitie 20%' OR "name" LIKE '%Victor League 20%' OR "name" LIKE '%WVBF Competitie 20%' OR "name" LIKE '%LFBB Interclubs 20%' OR "name" LIKE '%Limburgse interclubcompetitie 20%' OR "name" LIKE '%PBA competitie 20%' OR "name" LIKE '%VVBBC interclubcompetitie 20%';`,
        { transaction: t },
      );
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.removeColumn(
        { tableName: 'EventCompetitions', schema: 'event' },
        'official',
        { transaction: t },
      );
      await queryInterface.removeColumn(
        { tableName: 'EventTournaments', schema: 'event' },
        'official',
        { transaction: t },
      );
    });
  },
};
