/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {

        await queryInterface.removeColumn(
          {
            tableName: 'EventCompetitions',
            schema: 'event',
          },
          'usedRankingAmount',
          { transaction: t }
        );

       
        await queryInterface.removeColumn(
          {
            tableName: 'EventTournaments',
            schema: 'event',
          },
          'usedRankingAmount',
          { transaction: t }
        );
        
        await queryInterface.addColumn(
          {
            tableName: 'EventCompetitions',
            schema: 'event',
          },
          'usedRankingAmount',
          {
            type: sequelize.INTEGER,
            defaultValue: 4,
          },
          { transaction: t }
        );


        await queryInterface.addColumn(
          {
            tableName: 'EventTournaments',
            schema: 'event',
          },
          'usedRankingAmount',
          {
            type: sequelize.INTEGER,
            defaultValue: 4,
          },
          { transaction: t }
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
      

      

     
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
