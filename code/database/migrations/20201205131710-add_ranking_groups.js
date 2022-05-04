/* eslint-disable no-console */
'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.createTable(
        'Groups',
        {
          id: {
            type: sequelize.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          createdAt: {
            type: sequelize.DataTypes.DATE
          },
          updatedAt: {
            type: sequelize.DataTypes.DATE
          },
          name: {
            type: sequelize.DataTypes.STRING
          }
        },
        { transaction: t, schema: 'ranking' }
      );
      await queryInterface.createTable(
        'SubEvents',
        {
          id: {
            type: sequelize.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          createdAt: sequelize.DataTypes.DATE,
          updatedAt: sequelize.DataTypes.DATE,
          name: sequelize.DataTypes.STRING,
          internalId: sequelize.DataTypes.INTEGER,
          eventType: sequelize.DataTypes.ENUM('M', 'F', 'MX', 'MINIBAD'),
          drawType: sequelize.DataTypes.ENUM('KO', 'POULE', 'QUALIFICATION'),
          gameType: sequelize.DataTypes.ENUM('S', 'D', 'MX'),
          levelType: {
            type: sequelize.ENUM('PROV', 'LIGA', 'NATIONAAL')
          },
          level: sequelize.DataTypes.INTEGER,
          size: sequelize.DataTypes.INTEGER,
          FileId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: 'Files',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          }
        },
        { transaction: t, schema: 'import' }
      );
      await queryInterface.createTable(
        'GroupSubEvents',
        {
          SubEventId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: {
                tableName: 'SubEvents',
                schema: 'public'
              },
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          GroupId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: 'Groups',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          }
        },
        { transaction: t, schema: 'ranking' }
      );
      await queryInterface.createTable(
        'GroupSystems',
        {
          SystemId: {
            type: sequelize.DataTypes.INTEGER,
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
          GroupId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: 'Groups',
              schema: 'ranking',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          }
        },
        { transaction: t, schema: 'ranking' }
      );
      await queryInterface.removeColumn('Events', 'usedForRanking', {
        schema: 'public',
        transaction: t
      });

      await queryInterface.bulkInsert(
        { tableName: 'Groups', schema: 'ranking' },
        [
          {
            id: 1,
            name: 'Adults',
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 2,
            name: 'Yought',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        {
          transaction: t
        }
      );

      // link current SubEvents to the Default group
      const [
        subEventIds
      ] = await queryInterface.sequelize.query(
        'SELECT id FROM public."SubEvents";',
        { transaction: t }
      );

      if (subEventIds && subEventIds.length > 0) {
        await queryInterface.bulkInsert(
          { tableName: 'GroupSubEvents', schema: 'ranking' },
          subEventIds.map(subEvent => {
            return {
              SubEventId: subEvent.id,
              GroupId: 1
            };
          }),
          {
            transaction: t
          }
        );
      }

      // link current Systems to the Default group
      const [systemsIds] = await queryInterface.sequelize.query(
        'SELECT id FROM ranking."Systems";'
      );

      if (systemsIds && systemsIds.length > 0) {
        await queryInterface.bulkInsert(
          { tableName: 'GroupSystems', schema: 'ranking' },
          systemsIds.map(system => {
            return {
              SystemId: system.id,
              GroupId: 1
            };
          }),
          {
            transaction: t
          }
        );
      }
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.dropTable(
        {
          tableName: 'GroupSubEvents',
          schema: 'ranking'
        },
        {
          transaction: t
        }
      );
      await queryInterface.dropTable(
        {
          tableName: 'GroupSystems',
          schema: 'ranking'
        },
        {
          transaction: t
        }
      );
      await queryInterface.dropTable(
        {
          tableName: 'Groups',
          schema: 'ranking'
        },
        {
          transaction: t
        }
      );

      await queryInterface.dropTable(
        {
          tableName: 'SubEvents',
          schema: 'import'
        },
        {
          transaction: t
        }
      );

      
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS import."enum_SubEvents_eventType";', {
        transaction: t,
      });
      
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS import."enum_SubEvents_gameType";', {
        transaction: t,
      });
      
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS import."enum_SubEvents_drawType";', {
        transaction: t,
      });
      
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS import."enum_SubEvents_levelType";', {
        transaction: t,
      });
      
      await queryInterface.addColumn('Events', 'usedForRanking', {
        type: sequelize.DataTypes.BOOLEAN,
        schema: 'public'
      });
    });
  }
};
