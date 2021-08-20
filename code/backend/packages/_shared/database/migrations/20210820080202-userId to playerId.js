'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.renameColumn(
        {
          tableName: 'PlayerClaimMemberships',
          schema: 'security'
        },
        'userId',
        'playerId',
        { transaction: t }
      );

      await queryInterface.renameColumn(
        {
          tableName: 'PlayerRoleMemberships',
          schema: 'security'
        },
        'userId',
        'playerId',
        { transaction: t }
      );

      await queryInterface.renameColumn(
        {
          tableName: 'Points',
          schema: 'ranking'
        },
        'PlayerId',
        'playerId',
        { transaction: t }
      );

      await queryInterface.renameColumn(
        {
          tableName: 'Places',
          schema: 'ranking'
        },
        'PlayerId',
        'playerId',
        { transaction: t }
      );
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.renameColumn(
        {
          tableName: 'PlayerClaimMemberships',
          schema: 'security'
        },
        'playerId',
        'userId',
        { transaction: t }
      );

      await queryInterface.renameColumn(
        {
          tableName: 'PlayerRoleMemberships',
          schema: 'security'
        },
        'playerId',
        'userId',
        { transaction: t }
      );

      await queryInterface.renameColumn(
        {
          tableName: 'Points',
          schema: 'ranking'
        },
        'playerId',
        'PlayerId',
        { transaction: t }
      );

      await queryInterface.renameColumn(
        {
          tableName: 'Places',
          schema: 'ranking'
        },
        'playerId',
        'PlayerId',
        { transaction: t }
      );
    });
  }
};
