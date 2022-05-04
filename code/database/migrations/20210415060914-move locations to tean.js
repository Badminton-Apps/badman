'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.dropTable(
        {
          tableName: 'LocationEventCompetitions',
          schema: 'event'
        },
        { transaction: t }
      );

      await queryInterface.createTable(
        {
          tableName: 'TeamLocationCompetitions',
          schema: 'event'
        },
        {
          teamId: {
            type: sequelize.DataTypes.STRING,
            references: {
              model: {
                tableName: 'Teams',
                schema: 'public'
              },
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
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
            onDelete: 'CASCADE'
          }        
        },
        { transaction: t }
      );
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.createTable(
        {
          tableName: 'LocationEventCompetitions',
          schema: 'event'
        },
        {
          id: {
            type: sequelize.DataTypes.STRING,
            primaryKey: true
          },
          eventId: {
            type: sequelize.DataTypes.STRING,
            references: {
              model: {
                tableName: 'EventCompetitions',
                schema: 'event'
              },
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
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
            onDelete: 'CASCADE'
          }
        },
        { transaction: t }
      );

      await queryInterface.dropTable(
        {
          tableName: 'TeamLocationCompetitions',
          schema: 'event'
        },
        { transaction: t }
      );

    });
  }
};
