'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.createTable(
        {
          tableName: 'Comments',
          schema: 'public'
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
          clubId: {
            type: sequelize.DataTypes.STRING,
            references: {
              model: {
                tableName: 'Clubs',
                schema: 'public'
              },
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          message: {
            type: sequelize.DataTypes.TEXT
          },
          linkId: {
            type: sequelize.DataTypes.STRING
          },
          linkType: {
            type: sequelize.DataTypes.STRING
          }
        },
        { transaction: t }
      );

      await queryInterface.addIndex(
        {
          tableName: 'Comments',
          schema: 'public'
        },
        {
          fields: ['linkId', 'linkType', 'clubId'],
          name: 'comment_index',
          transaction: t
        }
      );
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeIndex(
        {
          tableName: 'Comments',
          schema: 'public'
        },
        'comment_index',
        { transaction: t }
      );
      await queryInterface.dropTable(
        {
          tableName: 'Comments',
          schema: 'public'
        },

        { transaction: t }
      );
    });
  }
};
