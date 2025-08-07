"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction((t) => {
      return queryInterface.addColumn(
        { tableName: "Assemblies", schema: "personal" },
        "isComplete",
        {
          type: Sequelize.DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        { transaction: t }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction((t) => {
      return queryInterface.removeColumn(
        { tableName: "Assemblies", schema: "personal" },
        "isComplete",
        {
          type: Sequelize.DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        { transaction: t }
      );
    });
  },
};
