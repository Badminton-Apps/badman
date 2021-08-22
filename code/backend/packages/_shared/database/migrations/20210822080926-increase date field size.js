'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      try {
        // DrawCompetitions
        await queryInterface.changeColumn(
          {
            tableName: 'EventTournaments',
            schema: 'event'
          },
          'dates',
          { type: sequelize.DataTypes.TEXT },
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
        await queryInterface.changeColumn(
          {
            tableName: 'EventTournaments',
            schema: 'event'
          },
          'dates',
          { type: sequelize.DataTypes.STRING },
          { transaction: t }
        );

        
      } catch (err) {
        console.error(err);
        throw err;
      }
    });
  }
};
