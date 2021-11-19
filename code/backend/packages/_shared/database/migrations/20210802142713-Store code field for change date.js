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
          'visualCode',
          {
            type: sequelize.DataTypes.STRING,
            allowNull: true
          },
          { transaction: t }
        );
       
      } catch (err) {
        console.error(err);
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
        'visualCode',
        { transaction: t }
      );
     
    });
  }
};
