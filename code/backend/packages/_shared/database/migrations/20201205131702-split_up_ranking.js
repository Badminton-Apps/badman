/* eslint-disable no-console */
'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    const [rankingSystems] = await queryInterface.sequelize.query(
      'SELECT * FROM public."RankingSystems";'
    );

    await queryInterface.sequelize.transaction(async t => {
      console.log('dropping tables');
      await queryInterface.dropTable('RankingPlaces', {
        transaction: t,
        schema: 'public'
      });
      await queryInterface.dropTable('RankingPoints', {
        transaction: t,
        schema: 'public'
      });
      await queryInterface.dropTable('RankingSystems', {
        transaction: t,
        schema: 'public'
      });

      console.log('dropping enums on public');

      await queryInterface.dropEnum('enum_RankingSystems_startingType', {
        transaction: t,
        schema: 'public'
      });

      await queryInterface.dropEnum('enum_RankingSystems_rankingSystem', {
        transaction: t,
        schema: 'public'
      });

      await queryInterface.dropEnum('enum_RankingSystems_intervalUnit', {
        transaction: t,
        schema: 'public'
      });

      await queryInterface.dropEnum('enum_RankingSystems_intervalCalcUnit', {
        transaction: t,
        schema: 'public'
      });
      await queryInterface.dropEnum('enum_RankingSystems_inactivityUnit', {
        transaction: t,
        schema: 'public'
      });

      console.log('Creating schema');
      await queryInterface.createSchema('ranking', { transaction: t });

      await queryInterface.createTable(
        'Systems',
        {
          id: {
            type: sequelize.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          name: sequelize.DataTypes.STRING,
          amountOfLevels: sequelize.DataTypes.INTEGER,
          primary: sequelize.DataTypes.BOOLEAN,

          procentWinning: sequelize.DataTypes.INTEGER,
          procentWinningPlus1: sequelize.DataTypes.INTEGER,
          procentLosing: sequelize.DataTypes.INTEGER,
          minNumberOfGamesUsedForUpgrade: {
            type: sequelize.DataTypes.INTEGER
          },
          maxDiffLevels: sequelize.DataTypes.INTEGER,
          maxDiffLevelsHighest: sequelize.DataTypes.INTEGER,
          latestXGamesToUse: sequelize.DataTypes.INTEGER,
          intervalAmount: sequelize.DataTypes.INTEGER,
          intervalUnit: sequelize.DataTypes.ENUM('months', 'weeks', 'days'),
          intervalCalcAmount: sequelize.DataTypes.INTEGER,
          intervalCalcUnit: sequelize.DataTypes.ENUM('months', 'weeks', 'days'),
          rankingSystem: sequelize.DataTypes.ENUM('BVL', 'ORIGINAL', 'LFBB'),
          runCurrently: sequelize.DataTypes.BOOLEAN,
          runDate: sequelize.DataTypes.DATE,
          runById: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: {
                tableName: 'Players',
                schema: 'public'
              },
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },

          startingType: sequelize.DataTypes.ENUM(
            'formula',
            'tableLFBB',
            'tableBVL'
          ),
          differenceForUpgrade: sequelize.DataTypes.INTEGER,
          differenceForDowngrade: sequelize.DataTypes.INTEGER,
          maxLevelUpPerChange: sequelize.DataTypes.INTEGER,
          maxLevelDownPerChange: sequelize.DataTypes.INTEGER,
          inactivityAmount: sequelize.DataTypes.INTEGER,
          inactivityUnit: sequelize.ENUM('months', 'weeks', 'days'),
          gamesForInactivty: sequelize.DataTypes.INTEGER,
          createdAt: sequelize.DataTypes.DATE,
          updatedAt: sequelize.DataTypes.DATE
        },
        { transaction: t, schema: 'ranking' }
      );

      await queryInterface.createTable(
        'Places',
        {
          id: {
            type: sequelize.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          rankingDate: sequelize.DataTypes.DATE,
          singlePoints: sequelize.DataTypes.INTEGER,
          mixPoints: sequelize.DataTypes.INTEGER,
          doublePoints: sequelize.DataTypes.INTEGER,
          singleRank: sequelize.DataTypes.INTEGER,
          mixRank: sequelize.DataTypes.INTEGER,
          doubleRank: sequelize.DataTypes.INTEGER,
          single: sequelize.DataTypes.INTEGER,
          mix: sequelize.DataTypes.INTEGER,
          double: sequelize.DataTypes.INTEGER,
          singlePointsDowngrade: sequelize.DataTypes.INTEGER,
          doublePointsDowngrade: sequelize.DataTypes.INTEGER,
          mixPointsDowngrade: sequelize.DataTypes.INTEGER,
          singleInactive: {
            type: sequelize.DataTypes.BOOLEAN,
            defaultValue: false
          },
          doubleInactive: {
            type: sequelize.DataTypes.BOOLEAN,
            defaultValue: false
          },
          mixInactive: {
            type: sequelize.DataTypes.BOOLEAN,
            defaultValue: false
          },
          totalSingleRanking: sequelize.DataTypes.INTEGER,
          totalDoubleRanking: sequelize.DataTypes.INTEGER,
          totalMixRanking: sequelize.DataTypes.INTEGER,
          totalWithinSingleLevel: sequelize.DataTypes.INTEGER,
          totalWithinDoubleLevel: sequelize.DataTypes.INTEGER,
          totalWithinMixLevel: sequelize.DataTypes.INTEGER,

          PlayerId: {
            type: sequelize.DataTypes.INTEGER,
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
          SystemId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: 'Systems',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          createdAt: sequelize.DataTypes.DATE,
          updatedAt: sequelize.DataTypes.DATE
        },
        { transaction: t, schema: 'ranking' }
      );

      await queryInterface.createTable(
        'Points',
        {
          id: {
            type: sequelize.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          points: sequelize.DataTypes.INTEGER,
          rankingDate: sequelize.DataTypes.DATE,
          differenceInLevel: sequelize.DataTypes.INTEGER,

          PlayerId: {
            type: sequelize.DataTypes.INTEGER,
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
          GameId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: {
                tableName: 'Games',
                schema: 'public'
              },
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          SystemId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: 'Systems',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          createdAt: sequelize.DataTypes.DATE,
          updatedAt: sequelize.DataTypes.DATE
        },
        { transaction: t, schema: 'ranking' }
      );

      console.log('Adding constrained');

      await queryInterface.addConstraint('Places', {
        schema: 'ranking',
        fields: ['rankingDate', 'PlayerId', 'SystemId'],
        type: 'unique',
        name: 'compositeIndex',
        transaction: t
      });
    });

    console.log('Adding systems back');
    if (rankingSystems && rankingSystems.length > 0){
      await queryInterface.bulkInsert(
        { tableName: 'Systems', schema: 'ranking' },
        rankingSystems
      );
    }
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      const [
        rankingSystems
      ] = await queryInterface.sequelize.query(
        'SELECT * FROM ranking."Systems";',
        { transaction: t }
      );

      await queryInterface.removeConstraint('Places', 'compositeIndex', {
        transaction: t,
        schema: 'ranking'
      });

      await queryInterface.dropTable('Places', {
        transaction: t,
        schema: 'ranking'
      });
      await queryInterface.dropTable('Points', {
        transaction: t,
        schema: 'ranking'
      });

      await queryInterface.dropTable('Systems', {
        transaction: t,
        schema: 'ranking'
      });
      await queryInterface.dropSchema('ranking', {
        transaction: t,
        schema: 'public'
      });

      await queryInterface.dropEnum('enum_RankingSystems_startingType', {
        transaction: t,
        schema: 'ranking'
      });

      await queryInterface.createTable(
        'RankingSystems',
        {
          id: {
            type: sequelize.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          name: sequelize.DataTypes.STRING,
          amountOfLevels: sequelize.DataTypes.INTEGER,
          primary: sequelize.DataTypes.BOOLEAN,

          procentWinning: sequelize.DataTypes.INTEGER,
          procentWinningPlus1: sequelize.DataTypes.INTEGER,
          procentLosing: sequelize.DataTypes.INTEGER,
          minNumberOfGamesUsedForUpgrade: {
            type: sequelize.DataTypes.INTEGER
          },
          maxDiffLevels: sequelize.DataTypes.INTEGER,
          maxDiffLevelsHighest: sequelize.DataTypes.INTEGER,
          latestXGamesToUse: sequelize.DataTypes.INTEGER,
          intervalAmount: sequelize.DataTypes.INTEGER,
          intervalUnit: sequelize.DataTypes.ENUM('months', 'weeks', 'days'),
          intervalCalcAmount: sequelize.DataTypes.INTEGER,
          intervalCalcUnit: sequelize.DataTypes.ENUM('months', 'weeks', 'days'),
          rankingSystem: sequelize.DataTypes.ENUM('BVL', 'ORIGINAL', 'LFBB'),
          runCurrently: sequelize.DataTypes.BOOLEAN,
          runDate: sequelize.DataTypes.DATE,
          runById: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: {
                tableName: 'Players',
                schema: 'public'
              },
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },

          startingType: sequelize.DataTypes.ENUM(
            'formula',
            'tableLFBB',
            'tableBVL'
          ),
          differenceForUpgrade: sequelize.DataTypes.INTEGER,
          differenceForDowngrade: sequelize.DataTypes.INTEGER,
          maxLevelUpPerChange: sequelize.DataTypes.INTEGER,
          maxLevelDownPerChange: sequelize.DataTypes.INTEGER,
          inactivityAmount: sequelize.DataTypes.INTEGER,
          inactivityUnit: sequelize.ENUM('months', 'weeks', 'days'),
          gamesForInactivty: sequelize.DataTypes.INTEGER,

          createdAt: sequelize.DataTypes.DATE,
          updatedAt: sequelize.DataTypes.DATE
        },
        { transaction: t, schema: 'public' }
      );

      await queryInterface.createTable(
        'RankingPlaces',
        {
          id: {
            type: sequelize.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          rankingDate: sequelize.DataTypes.DATE,
          singlePoints: sequelize.DataTypes.INTEGER,
          mixPoints: sequelize.DataTypes.INTEGER,
          doublePoints: sequelize.DataTypes.INTEGER,
          singleRank: sequelize.DataTypes.INTEGER,
          mixRank: sequelize.DataTypes.INTEGER,
          doubleRank: sequelize.DataTypes.INTEGER,
          single: sequelize.DataTypes.INTEGER,
          mix: sequelize.DataTypes.INTEGER,
          double: sequelize.DataTypes.INTEGER,
          singlePointsDowngrade: sequelize.DataTypes.INTEGER,
          doublePointsDowngrade: sequelize.DataTypes.INTEGER,
          mixPointsDowngrade: sequelize.DataTypes.INTEGER,
          singleInactive: {
            type: sequelize.DataTypes.BOOLEAN,
            defaultValue: false
          },
          doubleInactive: {
            type: sequelize.DataTypes.BOOLEAN,
            defaultValue: false
          },
          mixInactive: {
            type: sequelize.DataTypes.BOOLEAN,
            defaultValue: false
          },
          totalSingleRanking: sequelize.DataTypes.INTEGER,
          totalDoubleRanking: sequelize.DataTypes.INTEGER,
          totalMixRanking: sequelize.DataTypes.INTEGER,
          totalWithinSingleLevel: sequelize.DataTypes.INTEGER,
          totalWithinDoubleLevel: sequelize.DataTypes.INTEGER,
          totalWithinMixLevel: sequelize.DataTypes.INTEGER,

          PlayerId: {
            type: sequelize.DataTypes.INTEGER,
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
          RankingTypeId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: 'RankingSystems',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          createdAt: sequelize.DataTypes.DATE,
          updatedAt: sequelize.DataTypes.DATE
        },
        { transaction: t, schema: 'public' }
      );

      await queryInterface.createTable(
        'RankingPoints',
        {
          id: {
            type: sequelize.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          points: sequelize.DataTypes.INTEGER,
          rankingDate: sequelize.DataTypes.DATE,
          differenceInLevel: sequelize.DataTypes.INTEGER,

          PlayerId: {
            type: sequelize.DataTypes.INTEGER,
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
          GameId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: {
                tableName: 'Games',
                schema: 'public'
              },
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          RankingTypeId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: 'RankingSystems',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          createdAt: sequelize.DataTypes.DATE,
          updatedAt: sequelize.DataTypes.DATE
        },
        { transaction: t, schema: 'public' }
      );

      console.log('Adding systems back');
      await queryInterface.bulkInsert('RankingSystems', rankingSystems, {
        transaction: t,
        schema: 'public'
      });
    });
  }
};