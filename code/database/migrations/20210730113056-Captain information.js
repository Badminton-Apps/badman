'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      try {
        await queryInterface.addColumn(
          {
            tableName: 'Teams',
            schema: 'public'
          },
          'email',
          {
            type: sequelize.DataTypes.STRING,
            allowNull: true
          },
          { transaction: t }
        );
        await queryInterface.addColumn(
          {
            tableName: 'Teams',
            schema: 'public'
          },
          'phone',
          {
            type: sequelize.DataTypes.STRING,
            allowNull: true
          },
          { transaction: t }
        );
      } catch (err) {
        console.error(err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeColumn(
        {
          tableName: 'Teams',
          schema: 'public'
        },
        'email',
        { transaction: t }
      );
      await queryInterface.removeColumn(
        {
          tableName: 'Teams',
          schema: 'public'
        },
        'phone',
        { transaction: t }
      );
    });
  }
};
