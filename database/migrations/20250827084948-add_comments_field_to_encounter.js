"use strict";

/** @type {import('sequelize-cli').Migration} */

const columnsToAdd = ["comments"];

module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction((t) => {
      return Promise.all(
        columnsToAdd.map((column) =>
          queryInterface.addColumn(
            { tableName: "EncounterCompetitions", schema: "event" },
            column,
            {
              type: Sequelize.DataTypes.TEXT,
              allowNull: true,
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
            { transaction: t }
          )
        )
      );
    });
  },
};
