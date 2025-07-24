'use strict';

/** @type {import('sequelize-cli').Migration} */

const columnsToAdd = ['tempHomeCaptainId', 'tempAwayCaptainId'];

module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction((t) => {
      return Promise.all(
        columnsToAdd.map((column) =>
          queryInterface.addColumn(
            { tableName: 'EncounterCompetitions', schema: 'event' },
            column,
            {
              type: Sequelize.DataTypes.UUID,
              allowNull: true,
              references: {
                model: { tableName: 'Players', schema: 'public' },
                key: 'id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL',
            },
            { transaction: t },
          ),
        ),
      );
    });
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction((t) => {
      return Promise.all(
        columnsToAdd.map((column) =>
          queryInterface.removeColumn(
            { tableName: 'EncounterCompetitions', schema: 'event' },
            column,
            { transaction: t },
          ),
        ),
      );
    });
  },
};
