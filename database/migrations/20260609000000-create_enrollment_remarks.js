"use strict";

module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.sequelize.query(
        `CREATE TYPE event.rescue_remark_source AS ENUM ('rescue', 'normal')`,
        { transaction: t }
      );
      await queryInterface.createTable(
        { tableName: "enrollment_remarks", schema: "event" },
        {
          id: {
            type: queryInterface.sequelize.constructor.DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
            defaultValue: queryInterface.sequelize.literal("uuid_generate_v4()"),
          },
          clubId: {
            type: queryInterface.sequelize.constructor.DataTypes.UUID,
            allowNull: false,
            references: { model: { tableName: "Clubs", schema: "public" }, key: "id" },
          },
          season: {
            type: queryInterface.sequelize.constructor.DataTypes.INTEGER,
            allowNull: false,
          },
          remarks: {
            type: queryInterface.sequelize.constructor.DataTypes.TEXT,
            allowNull: false,
          },
          adminEmail: {
            type: queryInterface.sequelize.constructor.DataTypes.STRING,
            allowNull: true,
          },
          source: {
            type: queryInterface.sequelize.literal("event.rescue_remark_source"),
            allowNull: false,
            defaultValue: "rescue",
          },
          createdAt: {
            type: queryInterface.sequelize.constructor.DataTypes.DATE,
            allowNull: false,
          },
          updatedAt: {
            type: queryInterface.sequelize.constructor.DataTypes.DATE,
            allowNull: false,
          },
        },
        { transaction: t }
      );
    });
  },

  down: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.dropTable(
        { tableName: "enrollment_remarks", schema: "event" },
        { transaction: t }
      );
      await queryInterface.sequelize.query(`DROP TYPE IF EXISTS event.rescue_remark_source`, {
        transaction: t,
      });
    });
  },
};
