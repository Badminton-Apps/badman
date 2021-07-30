'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      try {
        await queryInterface.addColumn(
          {
            tableName: 'EncounterCompetitions',
            schema: 'event'
          },
          'synced',
          {
            type: sequelize.DataTypes.DATE,
            allowNull: true
          },
          { transaction: t }
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeColumn(
        {
          tableName: 'EncounterCompetitions',
          schema: 'event'
        },
        'synced',
        { transaction: t }
      );
    });
  }
};
