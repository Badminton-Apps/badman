"use strict";

/** @type {import('sequelize-cli').Migration} */

module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.renameColumn(
        { tableName: "EncounterCompetitions", schema: "event" },
        "synced",
        "dateSyncedAt",
        { transaction: t }
      );

      await queryInterface.addColumn(
        { tableName: "EncounterCompetitions", schema: "event" },
        "scoresSyncedAt",
        {
          type: Sequelize.DataTypes.DATE,
          allowNull: true,
        },
        { transaction: t }
      );
    });
  },

  async down(queryInterface, _Sequelize) {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.removeColumn(
        { tableName: "EncounterCompetitions", schema: "event" },
        "scoresSyncedAt",
        { transaction: t }
      );

      await queryInterface.renameColumn(
        { tableName: "EncounterCompetitions", schema: "event" },
        "dateSyncedAt",
        "synced",
        { transaction: t }
      );
    });
  },
};
