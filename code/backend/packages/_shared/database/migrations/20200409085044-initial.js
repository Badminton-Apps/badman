/* eslint-disable id-blacklist */
/* eslint-disable no-console */
'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    const nonRefrences = await queryInterface.sequelize.transaction();
    const refrences1 = await queryInterface.sequelize.transaction();
    const refrences2 = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.createTable(
        'Events',
        {
          id: {
            type: sequelize.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          number: sequelize.DataTypes.INTEGER,
          firstDay: sequelize.DataTypes.DATE,
          dates: sequelize.DataTypes.STRING,
          name: sequelize.DataTypes.STRING,
          type: {
            type: sequelize.ENUM('COMPETITION', 'TOERNAMENT')
          },

          createdAt: sequelize.DataTypes.DATE,
          updatedAt: sequelize.DataTypes.DATE
        },
        { transaction: nonRefrences, schema: 'public' }
      );
      await queryInterface.createTable(
        'SubEvents',
        {
          id: {
            type: sequelize.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          name: sequelize.DataTypes.STRING,
          eventType: {
            type: sequelize.ENUM('M', 'F', 'MX', 'MINIBAD')
          },
          drawType: {
            type: sequelize.ENUM('KO', 'POULE', 'QUALIFICATION')
          },
          levelType: {
            type: sequelize.ENUM('PROV', 'LIGA', 'NATIONAAL')
          },
          level: sequelize.DataTypes.INTEGER,
          size: sequelize.DataTypes.INTEGER,

          EventId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: 'Events',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },

          createdAt: sequelize.DataTypes.DATE,
          updatedAt: sequelize.DataTypes.DATE
        },
        { transaction: nonRefrences, schema: 'public' }
      );
      await queryInterface.createTable(
        'Players',
        {
          id: {
            type: sequelize.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          email: sequelize.DataTypes.STRING,
          gender: sequelize.DataTypes.STRING,
          token: sequelize.DataTypes.STRING,
          firstName: sequelize.DataTypes.STRING,
          lastName: sequelize.DataTypes.STRING,
          memberId: sequelize.DataTypes.STRING,

          createdAt: sequelize.DataTypes.DATE,
          updatedAt: sequelize.DataTypes.DATE
        },
        { transaction: nonRefrences, schema: 'public' }
      );

      await queryInterface.createTable(
        'RequestLinks',
        {
          id: {
            type: sequelize.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          email: sequelize.DataTypes.STRING,
          PlayerId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: 'Players',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },

          createdAt: sequelize.DataTypes.DATE,
          updatedAt: sequelize.DataTypes.DATE
        },
        { transaction: nonRefrences, schema: 'public' }
      );
      await queryInterface.createTable(
        'RankingTypes',
        {
          id: {
            type: sequelize.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          name: sequelize.DataTypes.STRING,
          amountOfLevels: sequelize.DataTypes.INTEGER,

          createdAt: sequelize.DataTypes.DATE,
          updatedAt: sequelize.DataTypes.DATE
        },
        { transaction: nonRefrences, schema: 'public' }
      );
      await queryInterface.createTable(
        'Clubs',
        {
          id: {
            type: sequelize.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          name: sequelize.DataTypes.STRING,
          clubId: sequelize.DataTypes.INTEGER,

          createdAt: sequelize.DataTypes.DATE,
          updatedAt: sequelize.DataTypes.DATE
        },
        { transaction: nonRefrences, schema: 'public' }
      );

      await nonRefrences.commit();
    } catch (error) {
      console.error('Non refrences', error);
      await nonRefrences.rollback();
    }

    try {
      await queryInterface.addConstraint('Players', {
        fields: ['firstName', 'lastName', 'memberId'],
        type: 'unique',
        name: 'compositeIndex',
        transaction: refrences1
      });
      await queryInterface.createTable(
        'Games',
        {
          id: {
            type: sequelize.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          playedAt: sequelize.DataTypes.DATE,
          gameType: {
            type: sequelize.ENUM('S', 'D', 'MX')
          },

          set1Team1: sequelize.DataTypes.INTEGER,
          set1Team2: sequelize.DataTypes.INTEGER,
          set2Team1: sequelize.DataTypes.INTEGER,
          set2Team2: sequelize.DataTypes.INTEGER,
          set3Team1: sequelize.DataTypes.INTEGER,
          set3Team2: sequelize.DataTypes.INTEGER,
          winner: sequelize.DataTypes.INTEGER,

          SubEventId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: 'SubEvents',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          player1Team1Id: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: 'Players',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          player2Team1Id: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: 'Players',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          player1Team2Id: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: 'Players',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          player2Team2Id: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: 'Players',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },

          createdAt: sequelize.DataTypes.DATE,
          updatedAt: sequelize.DataTypes.DATE
        },
        { transaction: refrences1, schema: 'public' }
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

          PlayerId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: 'Players',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          SystemId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: 'RankingTypes',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          createdAt: sequelize.DataTypes.DATE,
          updatedAt: sequelize.DataTypes.DATE
        },
        { transaction: refrences1, schema: 'public' }
      );
      await queryInterface.createTable(
        'ClubMemberships',
        {
          playerId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: 'Players',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          clubId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: 'Clubs',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          start: sequelize.DataTypes.DATE,
          end: sequelize.DataTypes.DATE,

          createdAt: sequelize.DataTypes.DATE,
          updatedAt: sequelize.DataTypes.DATE
        },
        { transaction: refrences1, schema: 'public' }
      );
      await queryInterface.createTable(
        'Teams',
        {
          id: {
            type: sequelize.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },

          lastName: sequelize.DataTypes.STRING,

          SubEventId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: 'SubEvents',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },

          createdAt: sequelize.DataTypes.DATE,
          updatedAt: sequelize.DataTypes.DATE
        },
        { transaction: refrences1, schema: 'public' }
      );
      await queryInterface.createTable(
        'TeamMemberships',
        {
          start: sequelize.DataTypes.DATE,
          end: sequelize.DataTypes.DATE,

          playerId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: 'Players',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          teamId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: 'Teams',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },

          createdAt: sequelize.DataTypes.DATE,
          updatedAt: sequelize.DataTypes.DATE
        },
        { transaction: refrences1, schema: 'public' }
      );

      await refrences1.commit();
    } catch (error) {
      console.error('Refrences', error);
      await refrences1.rollback();
      await nonRefrences.rollback();
    }

    try {
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
          countsForDowngrade: sequelize.DataTypes.BOOLEAN,

          PlayerId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: 'Players',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          GameId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: 'Games',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          SystemId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: 'RankingTypes',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          createdAt: sequelize.DataTypes.DATE,
          updatedAt: sequelize.DataTypes.DATE
        },
        { transaction: refrences2, schema: 'public' }
      );

      await refrences2.commit();
    } catch (error) {
      console.error('Refrences', error);
      await refrences2.rollback();
      await refrences1.rollback();
      await nonRefrences.rollback();
    }
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      const promise = Promise.all([
        queryInterface.removeConstraint('Players', 'compositeIndex', {
          transaction: t,
          schema: 'ranking'
        }),
        queryInterface.dropTable('ClubMemberships', {
          transaction: t,
          schema: 'public'
        }),
        queryInterface.dropTable('Clubs', { transaction: t, schema: 'public' }),
        queryInterface.dropTable('RankingPlaces', {
          transaction: t,
          schema: 'public'
        }),
        queryInterface.dropTable('RankingPoints', {
          transaction: t,
          schema: 'public'
        }),
        queryInterface.dropTable('RankingTypes', {
          transaction: t,
          schema: 'public'
        }),
        queryInterface.dropTable('RequestLinks', {
          transaction: t,
          schema: 'public'
        }),
        queryInterface.dropTable('TeamMemberships', {
          transaction: t,
          schema: 'public'
        }),
        queryInterface.dropTable('Teams', { transaction: t, schema: 'public' }),
        queryInterface.dropTable('Games', { transaction: t, schema: 'public' }),
        queryInterface.dropTable('Players', {
          transaction: t,
          schema: 'public'
        }),
        queryInterface.dropTable('SubEvents', {
          transaction: t,
          schema: 'public'
        }),
        queryInterface.dropTable('Events', {
          transaction: t,
          schema: 'public'
        }),
        queryInterface.sequelize.query('DROP TYPE IF EXISTS public."enum_Events_type";', {
          transaction: t,
        }),
        queryInterface.sequelize.query('DROP TYPE IF EXISTS public."enum_Games_gameType";', {
          transaction: t,
        }),
        queryInterface.sequelize.query('DROP TYPE IF EXISTS public."enum_SubEvents_drawType";', {
          transaction: t,
        }),
        queryInterface.sequelize.query(
          'DROP TYPE IF EXISTS public."enum_SubEvents_eventType";',
          {
            transaction: t,
          }
        ),
        queryInterface.sequelize.query(
          'DROP TYPE IF EXISTS "enum_SubEvents_levelType";',
          {
            transaction: t,
            schema: 'public'
          }
        )
      ]);
      promise.catch(err => {
        console.error('Failed migration', err);
      });

      return promise;
    });
  }
};
