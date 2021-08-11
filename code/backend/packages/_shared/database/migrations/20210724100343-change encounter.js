'use strict';

const newClaims = [
  [
    '58e44e85-6439-429c-b71b-7cc1ec326871',
    'change:encounter',
    'Change the date/time of a encounter',
    'clubs'
  ]
];

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      try {
        const dbNewClaims = await queryInterface.bulkInsert(
          { tableName: 'Claims', schema: 'security' },
          newClaims.map(claimName => {
            return {
              id: claimName[0],
              name: claimName[1],
              description: claimName[2],
              category: claimName[3],
              updatedAt: new Date(),
              createdAt: new Date(),
              type: 'team'
            };
          }),
          {
            transaction: t,
            ignoreDuplicates: true,
            returning: ['id']
          }
        );

        await queryInterface.addColumn(
          {
            tableName: 'EncounterCompetitions',
            schema: 'event'
          },
          'originalDate',
          {
            type: sequelize.DataTypes.DATE,
            allowNull: true
          },
          { transaction: t }
        );

        await queryInterface.addColumn(
          {
            tableName: 'EventCompetitions',
            schema: 'event'
          },
          'changeUntill_1',
          {
            type: sequelize.DataTypes.DATE,
            allowNull: true
          },
          { transaction: t }
        );

        await queryInterface.addColumn(
          {
            tableName: 'EventCompetitions',
            schema: 'event'
          },
          'changeUntill_2',
          {
            type: sequelize.DataTypes.DATE,
            allowNull: true
          },
          { transaction: t }
        );

        await queryInterface.createTable(
          'EncounterChanges',
          {
            id: {
              type: sequelize.DataTypes.STRING,
              primaryKey: true
            },

            accepted: {
              type: sequelize.DataTypes.BOOLEAN,
              allowNull: true
            },

            encounterId: {
              type: sequelize.DataTypes.STRING,
              references: {
                model: {
                  tableName: 'EncounterCompetitions',
                  schema: 'event'
                },
                key: 'id'
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL'
            },

            createdAt: sequelize.DataTypes.DATE,
            updatedAt: sequelize.DataTypes.DATE
          },
          { transaction: t, schema: 'event' }
        );

        await queryInterface.createTable(
          'EncounterChangeDates',
          {
            id: {
              type: sequelize.DataTypes.STRING,
              primaryKey: true
            },

            encounterChangeId: {
              type: sequelize.DataTypes.STRING,
              references: {
                model: {
                  tableName: 'EncounterChanges',
                  schema: 'event'
                },
                key: 'id'
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL'
            },

            selected: {
              type: sequelize.DataTypes.BOOLEAN,
              allowNull: true
            },

            date: {
              type: sequelize.DataTypes.DATE,
              allowNull: false
            },
            availabilityHome: {
              allowNull: true,
              type: sequelize.ENUM('POSSIBLE', 'NOT_POSSIBLE')
            },

            availabilityAway: {
              allowNull: true,
              type: sequelize.ENUM('POSSIBLE', 'NOT_POSSIBLE')
            },

            createdAt: sequelize.DataTypes.DATE,
            updatedAt: sequelize.DataTypes.DATE
          },
          { transaction: t, schema: 'event' }
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      try {
        await queryInterface.removeColumn(
          {
            tableName: 'EncounterCompetitions',
            schema: 'event'
          },
          'originalDate',
          { transaction: t }
        );
        await queryInterface.removeColumn(
          {
            tableName: 'EventCompetitions',
            schema: 'event'
          },
          'changeUntill_1',
          { transaction: t }
        );

        await queryInterface.removeColumn(
          {
            tableName: 'EventCompetitions',
            schema: 'event'
          },
          'changeUntill_2',
          { transaction: t }
        );

        await queryInterface.dropTable(
          {
            tableName: 'EncounterChangeDates',
            schema: 'event'
          },
          { transaction: t }
        );

        await queryInterface.dropTable(
          {
            tableName: 'EncounterChanges',
            schema: 'event'
          },
          { transaction: t }
        );

        await queryInterface.sequelize.query(
          'DROP TYPE IF EXISTS "event"."enum_EncounterChangeDates_availabilityAway";',
          {
            transaction: t
          }
        );

        await queryInterface.sequelize.query(
          'DROP TYPE IF EXISTS "event"."enum_EncounterChangeDates_availabilityHome";',
          {
            transaction: t
          }
        );
        await queryInterface.bulkDelete(
          { tableName: 'Claims', schema: 'security' },
          { id: { [Op.in]: newClaims.map(claimName => claimName[0]) } },
          { transaction: t }
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  }
};
