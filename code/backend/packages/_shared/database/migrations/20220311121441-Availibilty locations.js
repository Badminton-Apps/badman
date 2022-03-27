/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // Create new version of entries table
        await queryInterface.createTable(
          {
            tableName: 'Availabilities',
            schema: 'event',
          },
          {
            id: {
              defaultValue: Sequelize.DataTypes.UUIDV4,
              type: Sequelize.DataTypes.STRING,
              primaryKey: true,
            },

            exceptions: {
              type: Sequelize.DataTypes.JSON,
              allowNull: true,
            },

            days: {
              type: Sequelize.DataTypes.JSON,
              allowNull: false,
            },

            year: {
              type: Sequelize.DataTypes.INTEGER,
              allowNull: false,
            },

            locationId: {
              type: Sequelize.DataTypes.STRING,
              references: {
                model: {
                  tableName: 'Locations',
                  schema: 'event',
                },
                key: 'id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },

            // Other info

            createdAt: {
              type: Sequelize.DataTypes.DATE,
              allowNull: false,
            },
            updatedAt: {
              type: Sequelize.DataTypes.DATE,
              allowNull: false,
            },
          },
          { transaction: t }
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.dropTable(
          {
            tableName: 'Availabilities',
            schema: 'event',
          },
          {
            transaction: t,
          }
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
