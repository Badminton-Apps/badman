'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      try {
        // DrawCompetitions
        await queryInterface.removeConstraint(
          {
            tableName: 'DrawCompetitions',
            schema: 'event'
          },
          'DrawCompetitions_name_subeventId_key',
          { transaction: t }
        );

        await queryInterface.addColumn(
          {
            tableName: 'DrawCompetitions',
            schema: 'event'
          },
          'visualCode',
          { type: sequelize.DataTypes.STRING },
          { transaction: t }
        );

        await queryInterface.addConstraint(
          {
            tableName: 'DrawCompetitions',
            schema: 'event'
          },
          {
            onDelete: 'cascade',
            onUpdate: 'cascade',
            fields: ['name', 'visualCode', 'subeventId'],
            type: 'unique',
            name: 'DrawCompetitions_unique_constraint',
            transaction: t
          }
        );

        // EventCompetitions
        await queryInterface.removeColumn(
          {
            tableName: 'EventCompetitions',
            schema: 'event'
          },
          'uniCode',
          { transaction: t }
        );

        await queryInterface.removeConstraint(
          {
            tableName: 'EventCompetitions',
            schema: 'event'
          },
          'EventCompetitions_name_startYear_type_key',
          { transaction: t }
        );

        await queryInterface.addConstraint(
          {
            tableName: 'EventCompetitions',
            schema: 'event'
          },
          {
            onDelete: 'cascade',
            onUpdate: 'cascade',
            fields: ['name', 'startYear', 'type', 'visualCode'],
            type: 'unique',
            name: 'EventCompetitions_unique_constraint',
            transaction: t
          }
        );

        // SubEventCompetitions
        await queryInterface.addColumn(
          {
            tableName: 'SubEventCompetitions',
            schema: 'event'
          },
          'visualCode',
          { type: sequelize.DataTypes.STRING },
          { transaction: t }
        );

        await queryInterface.removeConstraint(
          {
            tableName: 'SubEventCompetitions',
            schema: 'event'
          },
          'SubEventCompetitions_name_eventType_eventId_key',
          { transaction: t }
        );

        await queryInterface.addConstraint(
          {
            tableName: 'SubEventCompetitions',
            schema: 'event'
          },
          {
            onDelete: 'cascade',
            onUpdate: 'cascade',
            fields: ['name', 'eventType', 'visualCode', 'eventId'],
            type: 'unique',
            name: 'SubEventCompetitions_unique_constraint',
            transaction: t
          }
        );

        // DrawTournaments
        await queryInterface.removeConstraint(
          {
            tableName: 'DrawTournaments',
            schema: 'event'
          },
          'DrawTournaments_name_type_internalId_subeventId_key',
          { transaction: t }
        );

        await queryInterface.changeColumn(
          {
            tableName: 'DrawTournaments',
            schema: 'event'
          },
          'internalId',
          { type: sequelize.DataTypes.STRING },
          { transaction: t }
        );

        await queryInterface.renameColumn(
          {
            tableName: 'DrawTournaments',
            schema: 'event'
          },
          'internalId',
          'visualCode',
          { transaction: t }
        );

        await queryInterface.addConstraint(
          {
            tableName: 'DrawTournaments',
            schema: 'event'
          },
          {
            onDelete: 'cascade',
            onUpdate: 'cascade',
            fields: ['name', 'type', 'visualCode', 'subeventId'],
            type: 'unique',
            name: 'DrawTournaments_unique_constraint',
            transaction: t
          }
        );

        // EventTournaments
        await queryInterface.removeColumn(
          {
            tableName: 'EventTournaments',
            schema: 'event'
          },
          'uniCode',
          { transaction: t }
        );

        await queryInterface.removeConstraint(
          {
            tableName: 'EventTournaments',
            schema: 'event'
          },
          'EventTournaments_name_firstDay_key',
          { transaction: t }
        );

        await queryInterface.addConstraint(
          {
            tableName: 'EventTournaments',
            schema: 'event'
          },
          {
            onDelete: 'cascade',
            onUpdate: 'cascade',
            fields: ['name', 'firstDay', 'visualCode'],
            type: 'unique',
            name: 'EventTournaments_unique_constraint',
            transaction: t
          }
        );

        // SubEventTournaments
        await queryInterface.changeColumn(
          {
            tableName: 'SubEventTournaments',
            schema: 'event'
          },
          'internalId',
          { type: sequelize.DataTypes.STRING },
          { transaction: t }
        );

        await queryInterface.renameColumn(
          {
            tableName: 'SubEventTournaments',
            schema: 'event'
          },
          'internalId',
          'visualCode',
          { transaction: t }
        );

        await queryInterface.removeConstraint(
          {
            tableName: 'SubEventTournaments',
            schema: 'event'
          },
          'SubEventTournaments_name_eventType_gameType_internalId_even_key',
          { transaction: t }
        );

        await queryInterface.addConstraint(
          {
            tableName: 'SubEventTournaments',
            schema: 'event'
          },
          {
            onDelete: 'cascade',
            onUpdate: 'cascade',
            fields: ['name', 'eventType', 'gameType', 'visualCode', 'eventId'],
            type: 'unique',
            name: 'SubEventTournaments_unique_constraint',
            transaction: t
          }
        );

        // importFile
        await queryInterface.removeColumn(
          {
            tableName: 'Files',
            schema: 'import'
          },
          'webID',
          { transaction: t }
        );

        await queryInterface.renameColumn(
          {
            tableName: 'Files',
            schema: 'import'
          },
          'uniCode',
          'visualCode',
          { transaction: t }
        );
      } catch (err) {
        console.error(err);
        throw err;
      }
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      try {
        // DrawCompetitions
        await queryInterface.removeConstraint(
          {
            tableName: 'DrawCompetitions',
            schema: 'event'
          },
          'DrawCompetitions_unique_constraint',
          { transaction: t }
        );

        await queryInterface.addConstraint(
          {
            tableName: 'DrawCompetitions',
            schema: 'event'
          },
          {
            onDelete: 'cascade',
            onUpdate: 'cascade',
            fields: ['name', 'subeventId'],
            type: 'unique',
            name: 'DrawCompetitions_name_subeventId_key',
            transaction: t
          }
        );

        await queryInterface.removeColumn(
          {
            tableName: 'DrawCompetitions',
            schema: 'event'
          },
          'visualCode',
          { transaction: t }
        );

        // EventCompetitions
        await queryInterface.addColumn(
          {
            tableName: 'EventCompetitions',
            schema: 'event'
          },
          'uniCode',
          { type: sequelize.DataTypes.STRING },
          { transaction: t }
        );

        await queryInterface.removeConstraint(
          {
            tableName: 'EventCompetitions',
            schema: 'event'
          },
          'EventCompetitions_unique_constraint',
          { transaction: t }
        );

        await queryInterface.addConstraint(
          {
            tableName: 'EventCompetitions',
            schema: 'event'
          },
          {
            onDelete: 'cascade',
            onUpdate: 'cascade',
            fields: ['name', 'startYear', 'type'],
            type: 'unique',
            name: 'EventCompetitions_name_startYear_type_key',
            transaction: t
          }
        );

        // SubEventCompetitions
        await queryInterface.removeConstraint(
          {
            tableName: 'SubEventCompetitions',
            schema: 'event'
          },
          'SubEventCompetitions_unique_constraint',
          { transaction: t }
        );

        await queryInterface.addConstraint(
          {
            tableName: 'SubEventCompetitions',
            schema: 'event'
          },
          {
            onDelete: 'cascade',
            onUpdate: 'cascade',
            fields: ['name', 'eventType', 'eventId'],
            type: 'unique',
            name: 'SubEventCompetitions_name_eventType_eventId_key',
            transaction: t
          }
        );

        await queryInterface.removeColumn(
          {
            tableName: 'SubEventCompetitions',
            schema: 'event'
          },
          'visualCode',
          { transaction: t }
        );

        // DrawTournaments
        await queryInterface.removeConstraint(
          {
            tableName: 'DrawTournaments',
            schema: 'event'
          },
          'DrawTournaments_unique_constraint',
          { transaction: t }
        );

        await queryInterface.renameColumn(
          {
            tableName: 'DrawTournaments',
            schema: 'event'
          },
          'visualCode',
          'internalId',
          { transaction: t }
        );

        await queryInterface.changeColumn(
          {
            tableName: 'DrawTournaments',
            schema: 'event'
          },
          'internalId',
          { type: 'INTEGER USING CAST("internalId" as INTEGER)' },
          { transaction: t }
        );

        await queryInterface.addConstraint(
          {
            tableName: 'DrawTournaments',
            schema: 'event'
          },
          {
            onDelete: 'cascade',
            onUpdate: 'cascade',
            fields: ['name', 'type', 'internalId', 'subeventId'],
            type: 'unique',
            name: 'DrawTournaments_name_type_internalId_subeventId_key',
            transaction: t
          }
        );

        // EventTournaments
        await queryInterface.addColumn(
          {
            tableName: 'EventTournaments',
            schema: 'event'
          },
          'uniCode',
          { type: sequelize.DataTypes.STRING },
          { transaction: t }
        );

        await queryInterface.removeConstraint(
          {
            tableName: 'EventTournaments',
            schema: 'event'
          },
          'EventTournaments_unique_constraint',
          { transaction: t }
        );

        await queryInterface.addConstraint(
          {
            tableName: 'EventTournaments',
            schema: 'event'
          },
          {
            onDelete: 'cascade',
            onUpdate: 'cascade',
            fields: ['name', 'firstDay'],
            type: 'unique',
            name: 'EventTournaments_name_firstDay_key',
            transaction: t
          }
        );

        // SubEventTournaments
        await queryInterface.renameColumn(
          {
            tableName: 'SubEventTournaments',
            schema: 'event'
          },
          'visualCode',
          'internalId',
          { transaction: t }
        );

        await queryInterface.changeColumn(
          {
            tableName: 'SubEventTournaments',
            schema: 'event'
          },
          'internalId',
          { type: 'INTEGER USING CAST("internalId" as INTEGER)' },
          { transaction: t }
        );

        await queryInterface.removeConstraint(
          {
            tableName: 'SubEventTournaments',
            schema: 'event'
          },
          'SubEventTournaments_unique_constraint',
          { transaction: t }
        );

        await queryInterface.addConstraint(
          {
            tableName: 'SubEventTournaments',
            schema: 'event'
          },
          {
            onDelete: 'cascade',
            onUpdate: 'cascade',
            fields: ['name', 'eventType', 'gameType', 'internalId', 'eventId'],
            type: 'unique',
            name:
              'SubEventTournaments_name_eventType_gameType_internalId_even_key',
            transaction: t
          }
        );

        // importFile
        await queryInterface.addColumn(
          {
            tableName: 'Files',
            schema: 'import'
          },
          'webID',
          { type: sequelize.DataTypes.STRING },
          { transaction: t }
        );

        await queryInterface.renameColumn(
          {
            tableName: 'Files',
            schema: 'import'
          },
          'visualCode',
          'uniCode',
          { transaction: t }
        );
      } catch (err) {
        console.error(err);
        throw err;
      }
    });
  }
};
