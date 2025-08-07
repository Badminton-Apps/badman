"use strict";

/** @type {import('sequelize-cli').Migration} */

const columnsToAdd = [
  "homeCaptainPresent",
  "awayCaptainPresent",
  "gameLeaderPresent",
  "homeCaptainAccepted",
  "awayCaptainAccepted",
  "gameLeaderAccepted",
];

module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction((t) => {
      return Promise.all(
        columnsToAdd.map((column) =>
          queryInterface.addColumn(
            { tableName: "EncounterCompetitions", schema: "event" },
            column,
            {
              type: Sequelize.DataTypes.BOOLEAN,
              allowNull: false,
              defaultValue: false,
            },
            { transaction: t }
          )
        )
      );
    });
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction((t) => {
      return Promise.all(
        columnsToAdd.map((column) =>
          queryInterface.removeColumn(
            { tableName: "EncounterCompetitions", schema: "event" },
            column,
            {
              type: Sequelize.DataTypes.BOOLEAN,
              allowNull: false,
              defaultValue: false,
            },
            { transaction: t }
          )
        )
      );
    });
  },
};
