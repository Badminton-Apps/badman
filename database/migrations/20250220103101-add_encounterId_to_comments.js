'use strict';

const columnsToAdd = ["encounterId"];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all(
        columnsToAdd.map(column => queryInterface.addColumn(
          { tableName: 'Comments', schema: 'public' },
          column,
          {
            type: Sequelize.DataTypes.UUID,
            allowNull: true,
            references: {
              model: {
                tableName: 'EncounterCompetitions',
                schema: 'event',
              },
              key: 'id',
            },
          },
          { transaction: t },
        ))
      );
    });
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all(
        columnsToAdd.map(column => queryInterface.removeColumn(
          { tableName: 'Comments', schema: 'public' },
          column,
          { transaction: t },
        ))
      );
    });
  }
};
