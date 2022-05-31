'use strict';

module.exports = {
  up: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.sequelize.query(
          `
          DROP INDEX "ranking"."lastPlaces_ranking_index";
          `,
          { transaction: t }
        );

        await queryInterface.addIndex(
          {
            tableName: 'LastPlaces',
            schema: 'ranking',
          },
          {
            fields: ['playerId', 'systemId'],
            type: 'unique',
            unique: true,
            name: 'lastPlaces_ranking_index',
          },
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

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.sequelize.query(
        `
        DROP INDEX "ranking"."lastPlaces_ranking_index";
        `,
        { transaction: t }
      );
      await queryInterface.addIndex(
        {
          tableName: 'LastPlaces',
          schema: 'ranking',
        },
        {
          fields: ['playerId'],
          type: 'unique',
          unique: true,
          name: 'lastPlaces_ranking_index',
          transaction: t,
        }
      );
    });
  },
};
