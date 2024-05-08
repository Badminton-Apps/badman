/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const { type } = require('node:os');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.createTable(
          {
            tableName: 'Logs',
            schema: 'system',
          },
          {
            id: {
              allowNull: false,
              primaryKey: true,
              type: sequelize.DataTypes.UUID,
              defaultValue: sequelize.DataTypes.UUIDV4,
            },
            updatedAt: {
              allowNull: true,
              type: sequelize.DataTypes.DATE,
            },
            createdAt: {
              allowNull: true,
              type: sequelize.DataTypes.DATE,
            },
            playerId: {
              type: sequelize.DataTypes.UUID,
              references: {
                model: {
                  tableName: 'Players',
                  schema: 'public',
                },
                key: 'id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
              allowNull: true,
            },
            action: {
              type: sequelize.DataTypes.STRING,
              allowNull: false,
            },
            meta: {
              type: sequelize.DataTypes.JSON,
              allowNull: true,
            },
          },
          {
            transaction: t,
          },
        );
        // index on playerid
        await queryInterface.addIndex(
          {
            tableName: 'Logs',
            schema: 'system',
          },
          ['playerId'],
          {
            transaction: t,
          },
        );
      } catch (err) {
        console.error('We errored with', err?.message ?? err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.dropTable(
          {
            tableName: 'Logs',
            schema: 'system',
          },
          {
            transaction: t,
          },
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
