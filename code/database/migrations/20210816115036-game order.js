'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      try {
        await queryInterface.addColumn(
          {
            tableName: 'Games',
            schema: 'event'
          },
          'order',
          {
            type: sequelize.DataTypes.INTEGER,
            allowNull: true
          },
          { transaction: t }
        );

        await queryInterface.addColumn(
          {
            tableName: 'Games',
            schema: 'event'
          },
          'round',
          {
            type: sequelize.DataTypes.STRING,
            allowNull: true
          },
          { transaction: t }
        );

        await queryInterface.addColumn(
          {
            tableName: 'Games',
            schema: 'event'
          },
          'visualCode',
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
          tableName: 'Games',
          schema: 'event'
        },
        'order',
        { transaction: t }
      );

      await queryInterface.removeColumn(
        {
          tableName: 'Games',
          schema: 'event'
        },
        'round',
        { transaction: t }
      );

      await queryInterface.removeColumn(
        {
          tableName: 'Games',
          schema: 'event'
        },
        'visualCode',
        { transaction: t }
      );
     
     
    });
  }
};
