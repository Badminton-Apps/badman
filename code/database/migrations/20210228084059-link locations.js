'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeConstraint(
        {
          tableName: 'Locations',
          schema: 'event'
        },
        'Locations_eventId_fkey',
        { transaction: t }
      );

      await queryInterface.removeColumn(
        {
          tableName: 'Locations',
          schema: 'event'
        },
        'eventId',
        { transaction: t }
      );

      await queryInterface.createTable(
        {
          tableName: 'ClubLocations',
          schema: 'public'
        },
        {
          createdAt: {
            type: sequelize.DataTypes.DATE,
            allowNull: false
          },
          updatedAt: {
            type: sequelize.DataTypes.DATE,
            allowNull: false
          },
          locationId: {
            type: sequelize.DataTypes.STRING,
            references: {
              model: {
                tableName: 'Locations',
                schema: 'event'
              },
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          clubId: {
            type: sequelize.DataTypes.STRING,
            references: {
              model: {
                tableName: 'Clubs',
                schema: 'public'
              },
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          }
        },
        { transaction: t }
      );
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.addColumn(
        {
          tableName: 'Locations',
          schema: 'event'
        },
        'eventId',
        {
          type: sequelize.DataTypes.STRING,
          references: {
            model: {
              tableName: 'Events',
              schema: 'evemt'
            },
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        { transaction: t }
      );
      await queryInterface.droptTable(
        {
          tableName: 'ClubLocations',
          schema: 'public'
        },
        { transaction: t }
      );
    });
  }
};
