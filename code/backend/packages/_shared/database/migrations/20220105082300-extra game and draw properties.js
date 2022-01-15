/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.addColumn(
          {
            tableName: 'Games',
            schema: 'event',
          },
          'status',
          {
            type: Sequelize.ENUM(
              'NORMAL',
              'WALKOVER',
              'RETIREMENT',
              'DISQUALIFIED',
              'NO_MATCH'
            ),
            default: 'NORMAL',
          },
          { transaction: t }
        );

        await queryInterface.addColumn(
          {
            tableName: 'DrawCompetitions',
            schema: 'event',
          },
          'type',
          {
            type: Sequelize.ENUM('KO', 'POULE', 'QUALIFICATION'),
          },
          { transaction: t }
        );

        await queryInterface.sequelize.query(
          'UPDATE event."DrawCompetitions" SET "type" = \'POULE\' WHERE "type" is NULL',
          { transaction: t }
        );

        await queryInterface.removeConstraint(
          {
            tableName: 'DrawCompetitions',
            schema: 'event',
          },
          'DrawCompetitions_unique_constraint',
          { transaction: t }
        );

        await queryInterface.addConstraint(
          {
            tableName: 'DrawCompetitions',
            schema: 'event',
          },
          {
            onDelete: 'cascade',
            onUpdate: 'cascade',
            fields: ['name', 'visualCode', 'subeventId', 'type'],
            type: 'unique',
            name: 'DrawCompetitions_unique_constraint',
            transaction: t,
          }
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
        await queryInterface.removeColumn(
          {
            tableName: 'Games',
            schema: 'event',
          },
          'status',
          { transaction: t }
        );

        await queryInterface.removeConstraint(
          {
            tableName: 'DrawCompetitions',
            schema: 'event',
          },
          'DrawCompetitions_unique_constraint',
          { transaction: t }
        );

        await queryInterface.removeColumn(
          {
            tableName: 'DrawCompetitions',
            schema: 'event',
          },
          'type',
          { transaction: t }
        );

        await queryInterface.addConstraint(
          {
            tableName: 'DrawCompetitions',
            schema: 'event',
          },
          {
            onDelete: 'cascade',
            onUpdate: 'cascade',
            fields: ['name', 'visualCode', 'subeventId'],
            type: 'unique',
            name: 'DrawCompetitions_unique_constraint',
            transaction: t,
          }
        );

        await queryInterface.sequelize.query(
          'DROP TYPE IF EXISTS event."enum_Games_status";',
          {
            transaction: t,
          }
        );

        await queryInterface.sequelize.query(
          'DROP TYPE IF EXISTS event."enum_DrawCompetitions_type";',
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
