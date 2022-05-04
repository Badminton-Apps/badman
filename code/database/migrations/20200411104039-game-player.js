/* eslint-disable no-console */
'use strict';

module.exports = {
  up: (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      const promise = Promise.all([
        queryInterface.removeColumn('Games', 'player1Team1Id', {
          transaction: t,
          schema: 'public'
        }),
        queryInterface.removeColumn('Games', 'player2Team1Id', {
          transaction: t,
          schema: 'public'
        }),
        queryInterface.removeColumn('Games', 'player1Team2Id', {
          transaction: t,
          schema: 'public'
        }),
        queryInterface.removeColumn('Games', 'player2Team2Id', {
          transaction: t,
          schema: 'public'
        }),
        queryInterface.createTable(
          'GamePlayers',
          {
            team: sequelize.DataTypes.INTEGER,
            player: sequelize.DataTypes.INTEGER,
            playerId: {
              type: sequelize.DataTypes.INTEGER,
              references: {
                model: 'Players',
                key: 'id'
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL'
            },
            gameId: {
              type: sequelize.DataTypes.INTEGER,
              references: {
                model: 'Games',
                key: 'id'
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL'
            }
          },
          { transaction: t, schema: 'public' }
        )
      ]);
      promise.catch(err => {
        console.error('Failed migration', err);
      });

      return promise;
    });
  },

  down: (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      const promise = Promise.all([
        queryInterface.addColumn(
          'Games',
          'player1Team1Id',
          {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: 'Players',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          { transaction: t, schema: 'public' }
        ),
        queryInterface.addColumn(
          'Games',
          'player2Team1Id',
          {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: 'Players',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          { transaction: t, schema: 'public' }
        ),
        queryInterface.addColumn(
          'Games',
          'player1Team2Id',
          {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: 'Players',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          { transaction: t, schema: 'public' }
        ),
        queryInterface.addColumn(
          'Games',
          'player2Team2Id',
          {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: 'Players',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          { transaction: t, schema: 'public' }
        ),
        queryInterface.dropTable('GamePlayers', {
          transaction: t,
          schema: 'public'
        })
      ]);
      promise.catch(err => {
        console.error('Failed migration', err);
      });

      return promise;
    });
  }
};
