/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.addColumn(
          {
            tableName: 'Places',
            schema: 'ranking',
          },
          'gender',
          { type: sequelize.DataTypes.STRING },
          { transaction: t }
        );

        await queryInterface.addColumn(
          {
            tableName: 'LastPlaces',
            schema: 'ranking',
          },
          'gender',
          { type: sequelize.DataTypes.STRING },
          { transaction: t }
        );

        let [playerIds] = await queryInterface.sequelize.query(
          `SELECT "playerId" from ranking."LastPlaces" where "playerId" is not null`,
          { transaction: t }
        );

        playerIds = playerIds.filter((v, i, a) => a.indexOf(v) === i);

        const [genders] = await queryInterface.sequelize.query(
          `SELECT "gender", "id" from public."Players" where "id" in ('${playerIds
            ?.map((r) => r?.playerId)
            ?.join("','")}')`,
          { transaction: t }
        );

        await queryInterface.sequelize.query(
          `update ranking."Places" as p
          set "gender" = s."gender" 
          from 
          (
            values
            ${genders?.map((g) => `('${g.id}','${g.gender}')`)?.join(',')}
          ) as s("playerId", "gender") 
          where p."playerId" = s."playerId"`,
          { transaction: t }
        );

        await queryInterface.sequelize.query(
          `update ranking."LastPlaces" as p 
          set "gender" = s."gender" 
          from 
          (
            values
            ${genders?.map((g) => `('${g.id}','${g.gender}')`)?.join(',')}
          ) as s("playerId", "gender") 
          where p."playerId" = s."playerId"`,
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
        await queryInterface.removeColumn(
          {
            tableName: 'Places',
            schema: 'ranking',
          },
          'gender',
          { transaction: t }
        );

        await queryInterface.removeColumn(
          {
            tableName: 'LastPlaces',
            schema: 'ranking',
          },
          'gender',
          { transaction: t }
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
