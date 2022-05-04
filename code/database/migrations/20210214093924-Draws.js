'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeColumn(
        {
          tableName: 'SubEvents',
          schema: 'event'
        },
        'drawType',
        { transaction: t }
      );
      await queryInterface.removeColumn(
        {
          tableName: 'SubEvents',
          schema: 'event'
        },
        'size',
        { transaction: t }
      );

      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS event."enum_SubEvents_drawType";',
        {
          transaction: t
        }
      );

      await queryInterface.createTable(
        {
          tableName: 'Draws',
          schema: 'event'
        },
        {
          id: {
            type: sequelize.DataTypes.STRING,
            primaryKey: true,
            allowNull: false
          },
          name: sequelize.DataTypes.STRING,
          type: {
            type: sequelize.ENUM('KO', 'POULE', 'QUALIFICATION')
          },
          size: sequelize.DataTypes.INTEGER,
          internalId: sequelize.DataTypes.INTEGER,

          createdAt: {
            type: sequelize.DataTypes.DATE,
            allowNull: false
          },
          updatedAt: {
            type: sequelize.DataTypes.DATE,
            allowNull: false
          },
          SubEventId: {
            type: sequelize.DataTypes.STRING,
            references: {
              model: {
                tableName: 'SubEvents',
                schema: 'event'
              },
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          }
        },
        { transaction: t }
      );

      await queryInterface.addIndex(
        {
          tableName: 'Draws',
          schema: 'event'
        },
        ['name'],
        { transaction: t }
      );

      await queryInterface.addConstraint(
        {
          tableName: 'Draws',
          schema: 'event'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['name', 'type', 'internalId', 'SubEventId'],
          type: 'unique',
          name: 'Draws_name_type_internalId_SubEventId_key',
          transaction: t
        }
      );

      await queryInterface.removeConstraint(
        {
          tableName: 'Games',
          schema: 'event'
        },
        'Games_subEventId_fkey',
        { transaction: t }
      );
      await queryInterface.removeColumn(
        {
          tableName: 'Games',
          schema: 'event'
        },
        'subEventId',
        { transaction: t }
      );

      await queryInterface.addColumn(
        {
          tableName: 'Games',
          schema: 'event'
        },
        'drawId',
        {
          type: sequelize.DataTypes.STRING,
          references: {
            model: {
              tableName: 'Draws',
              schema: 'event'
            },
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        { transaction: t }
      );

      await queryInterface.removeColumn(
        {
          tableName: 'SubEvents',
          schema: 'import'
        },
        'drawType',
        { transaction: t }
      );
      await queryInterface.removeColumn(
        {
          tableName: 'SubEvents',
          schema: 'import'
        },
        'size',
        { transaction: t }
      );

      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS import."enum_SubEvents_drawType";',
        {
          transaction: t
        }
      );

      await queryInterface.createTable(
        {
          tableName: 'Draws',
          schema: 'import'
        },
        {
          id: {
            type: sequelize.DataTypes.STRING,
            primaryKey: true,
            allowNull: false
          },
          name: sequelize.DataTypes.STRING,
          type: {
            type: sequelize.ENUM('KO', 'POULE', 'QUALIFICATION')
          },
          size: sequelize.DataTypes.INTEGER,
          internalId: sequelize.DataTypes.INTEGER,

          createdAt: {
            type: sequelize.DataTypes.DATE,
            allowNull: false
          },
          updatedAt: {
            type: sequelize.DataTypes.DATE,
            allowNull: false
          },
          SubEventId: {
            type: sequelize.DataTypes.STRING,
            references: {
              model: {
                tableName: 'SubEvents',
                schema: 'import'
              },
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          }
        },
        { transaction: t }
      );

      await queryInterface.addConstraint(
        {
          tableName: 'Draws',
          schema: 'import'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['name', 'type', 'internalId', 'SubEventId'],
          type: 'unique',
          name: 'Draws_name_type_internalId_SubEventId_key',
          transaction: t
        }
      );

      await queryInterface.addIndex(
        {
          tableName: 'Draws',
          schema: 'import'
        },
        ['name'],
        { transaction: t }
      );
      await queryInterface.addIndex(
        {
          tableName: 'SubEvents',
          schema: 'import'
        },
        ['name'],
        { transaction: t }
      );
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.addColumn(
        {
          tableName: 'SubEvents',
          schema: 'event'
        },
        'drawType',
        {
          type: sequelize.ENUM('KO', 'POULE', 'QUALIFICATION')
        },
        { transaction: t }
      );
      await queryInterface.addColumn(
        {
          tableName: 'SubEvents',
          schema: 'event'
        },
        'size',
        {
          type: sequelize.DataTypes.INTEGER
        },
        { transaction: t }
      );

      await queryInterface.removeConstraint(
        {
          tableName: 'Games',
          schema: 'event'
        },
        'Games_drawId_fkey',
        { transaction: t }
      );

      await queryInterface.dropTable(
        {
          tableName: 'Draws',
          schema: 'event'
        },
        { transaction: t }
      );

      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS event."enum_Draws_type";',
        {
          transaction: t
        }
      );

      await queryInterface.removeColumn(
        {
          tableName: 'Games',
          schema: 'event'
        },
        'drawId',
        { transaction: t }
      );

      await queryInterface.addColumn(
        {
          tableName: 'Games',
          schema: 'event'
        },
        'subEventId',
        {
          type: sequelize.DataTypes.STRING,
          references: {
            model: {
              tableName: 'SubEvents',
              schema: 'event'
            },
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        { transaction: t }
      );

      await queryInterface.addColumn(
        {
          tableName: 'SubEvents',
          schema: 'import'
        },
        'drawType',
        {
          type: sequelize.ENUM('KO', 'POULE', 'QUALIFICATION')
        },
        { transaction: t }
      );
      await queryInterface.addColumn(
        {
          tableName: 'SubEvents',
          schema: 'import'
        },
        'size',
        {
          type: sequelize.DataTypes.INTEGER
        },
        { transaction: t }
      );

      await queryInterface.dropTable(
        {
          tableName: 'Draws',
          schema: 'import'
        },
        { transaction: t }
      );

      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS import."enum_Draws_type";',
        {
          transaction: t
        }
      );
    });
  }
};
