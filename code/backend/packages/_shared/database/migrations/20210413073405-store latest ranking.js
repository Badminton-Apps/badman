'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.createTable(
        {
          tableName: 'LastPlaces',
          schema: 'ranking'
        },
        {
          id: {
            type: sequelize.DataTypes.STRING,
            primaryKey: true
          },
          createdAt: {
            type: sequelize.DataTypes.DATE
          },
          updatedAt: {
            type: sequelize.DataTypes.DATE
          },
          playerId: {
            type: sequelize.DataTypes.STRING,
            references: {
              model: {
                tableName: 'Players',
                schema: 'public'
              },
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          systemId: {
            type: sequelize.DataTypes.STRING,
            references: {
              model: {
                tableName: 'Systems',
                schema: 'ranking'
              },
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },

          rankingDate: sequelize.DataTypes.DATE,
          singlePoints: sequelize.DataTypes.INTEGER,
          mixPoints: sequelize.DataTypes.INTEGER,
          doublePoints: sequelize.DataTypes.INTEGER,

          singlePointsDowngrade: sequelize.DataTypes.INTEGER,
          mixPointsDowngrade: sequelize.DataTypes.INTEGER,
          doublePointsDowngrade: sequelize.DataTypes.INTEGER,

          singleRank: sequelize.DataTypes.INTEGER,
          mixRank: sequelize.DataTypes.INTEGER,
          doubleRank: sequelize.DataTypes.INTEGER,

          totalSingleRanking: sequelize.DataTypes.INTEGER,
          totalMixRanking: sequelize.DataTypes.INTEGER,
          totalDoubleRanking: sequelize.DataTypes.INTEGER,

          totalWithinSingleLevel: sequelize.DataTypes.INTEGER,
          totalWithinMixLevel: sequelize.DataTypes.INTEGER,
          totalWithinDoubleLevel: sequelize.DataTypes.INTEGER,

          single: sequelize.DataTypes.INTEGER,
          mix: sequelize.DataTypes.INTEGER,
          double: sequelize.DataTypes.INTEGER,

          singleInactive: sequelize.DataTypes.BOOLEAN,
          mixInactive: sequelize.DataTypes.BOOLEAN,
          doubleInactive: sequelize.DataTypes.BOOLEAN,

          createdAt: sequelize.DataTypes.DATE,
          updatedAt: sequelize.DataTypes.DATE
        },
        { transaction: t }
      );

      await queryInterface.addConstraint(
        {
          tableName: 'LastPlaces',
          schema: 'ranking'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['playerId', 'systemId'],
          type: 'unique',
          name: 'lastPlaces_unique_constraint',
          transaction: t
        }
      );

      await queryInterface.addIndex(
        {
          tableName: 'LastPlaces',
          schema: 'ranking'
        },
        {
          fields: ['playerId'],
          type: 'unique',
          unique: true,
          name: 'lastPlaces_ranking_index',
          transaction: t
        }
      );
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.dropTable(
        {
          tableName: 'LastPlaces',
          schema: 'ranking'
        },
        { transaction: t }
      );
    });
  }
};
