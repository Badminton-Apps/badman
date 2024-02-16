'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.createTable(
          {
            tableName: 'Assemblies',
            schema: 'personal',
          },
          {
            id: {
              allowNull: false,
              primaryKey: true,
              type: Sequelize.UUID,
              defaultValue: Sequelize.UUIDV4,
            },
            assembly: {
              type: Sequelize.JSON,
            },
            description: {
              type: Sequelize.TEXT,
            },
            encounterId: {
              type: Sequelize.UUID,
              references: {
                model: {
                  schema: 'event',
                  tableName: 'EncounterCompetitions',
                },
                key: 'id',
                deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL',
            },
            teamId: {
              type: Sequelize.UUID,
              references: {
                model: {
                  schema: 'public',
                  tableName: 'Teams',
                },
                key: 'id',
                deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL',
            },
            captainId: {
              type: Sequelize.UUID,
              references: {
                model: {
                  schema: 'public',
                  tableName: 'Players',
                },
                key: 'id',
                deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL',
            },
            playerId: {
              type: Sequelize.UUID,
              references: {
                model: {
                  schema: 'public',
                  tableName: 'Players',
                },
                key: 'id',
                deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE,
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL',
            },
            createdAt: {
              allowNull: false,
              type: Sequelize.DATE,
            },
            updatedAt: {
              allowNull: false,
              type: Sequelize.DATE,
            },
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
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction((t) => {
      return queryInterface.dropTable(
        {
          tableName: 'Assemblies',
          schema: 'personal',
        },
        {
          transaction: t,
        },
      );
    });
  },
};
