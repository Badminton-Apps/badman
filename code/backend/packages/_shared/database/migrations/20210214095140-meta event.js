'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.addColumn(
        {
          tableName: 'Locations',
          schema: 'event'
        },
        'address',
        {
          type: sequelize.DataTypes.STRING
        },
        { transaction: t }
      );

      await queryInterface.addColumn(
        {
          tableName: 'Locations',
          schema: 'event'
        },
        'city',
        {
          type: sequelize.DataTypes.STRING
        },
        { transaction: t }
      );
      await queryInterface.addColumn(
        {
          tableName: 'Locations',
          schema: 'event'
        },
        'fax',
        {
          type: sequelize.DataTypes.STRING
        },
        { transaction: t }
      );
      await queryInterface.addColumn(
        {
          tableName: 'Locations',
          schema: 'event'
        },
        'phone',
        {
          type: sequelize.DataTypes.STRING
        },
        { transaction: t }
      );
      await queryInterface.addColumn(
        {
          tableName: 'Locations',
          schema: 'event'
        },
        'postalcode',
        {
          type: sequelize.DataTypes.STRING
        },
        { transaction: t }
      );
      await queryInterface.addColumn(
        
        {
          tableName: 'Locations',
          schema: 'event'
        },
        'state',
        {
          type: sequelize.DataTypes.STRING
        },
        { transaction: t }
      );
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeColumn(
        {
          tableName: 'Locations',
          schema: 'event'
        },
        'address',
        { transaction: t }
      );

      await queryInterface.removeColumn(
        {
          tableName: 'Locations',
          schema: 'event'
        },
        'city',
        { transaction: t }
      );
      await queryInterface.removeColumn(
        {
          tableName: 'Locations',
          schema: 'event'
        },
        'fax',
        { transaction: t }
      );
      await queryInterface.removeColumn(
        {
          tableName: 'Locations',
          schema: 'event'
        },
        'phone',
        { transaction: t }
      );
      await queryInterface.removeColumn(
        {
          tableName: 'Locations',
          schema: 'event'
        },
        'postalcode',
        { transaction: t }
      );
      await queryInterface.removeColumn(
        {
          tableName: 'Locations',
          schema: 'event'
        },
        'state',
        { transaction: t }
      );
    });
  }
};
