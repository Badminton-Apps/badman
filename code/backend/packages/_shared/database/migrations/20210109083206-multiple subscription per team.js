'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeColumn(
        {
          tableName: 'ClubMemberships',
          schema: 'public'
        },
        'active',
        { transaction: t }
      );

      await queryInterface.addColumn(
        {
          tableName: 'ClubMemberships',
          schema: 'public'
        },
        'type',
        { type: sequelize.DataTypes.ENUM(['NORMAL', 'LOAN']) },
        { transaction: t }
      );

      await queryInterface.removeColumn(
        {
          tableName: 'Teams',
          schema: 'public'
        },
        'SubEventId',
        { transaction: t }
      );

      await queryInterface.addColumn(
        {
          tableName: 'TeamMemberships',
          schema: 'public'
        },
        'type',
        { type: sequelize.DataTypes.ENUM(['BASE', 'MORMAL']) },
        { transaction: t }
      );

      await queryInterface.createTable(
        'SubEventMemberships',
        {
          subEventId: {
            type: sequelize.DataTypes.INTEGER,
            references: {
              model: 'SubEvents',
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
          }
        },
        { transaction: t }
      );
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.addColumn(
        {
          tableName: 'ClubMemberships',
          schema: 'public'
        },
        'active',
        {
          type: sequelize.DataTypes.BOOLEAN,
          defaultValue: true
        },
        { transaction: t }
      );
      await queryInterface.removeColumn(
        {
          tableName: 'ClubMemberships',
          schema: 'public'
        },
        'type',
        { transaction: t }
      );

      await queryInterface.addColumn(
        {
          tableName: 'Teams',
          schema: 'public'
        },
        'SubEventId',
        {
          type: sequelize.DataTypes.INTEGER,
          references: {
            model: 'SubEvents',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        }
      );

      await queryInterface.removeColumn(
        {
          tableName: 'TeamMemberships',
          schema: 'public'
        },
        'type',
        { transaction: t }
      );

      await queryInterface.dropTable('SubEventMemberships', { transaction: t });

      await queryInterface.dropEnum('enum_ClubMemberships_type', {
        transaction: t,
        schema: 'public'
      });

      await queryInterface.dropEnum('enum_TeamMemberships_type', {
        transaction: t,
        schema: 'public'
      });
    });
  }
};
