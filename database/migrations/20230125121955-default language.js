'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, sequelize) {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.addColumn(
        { tableName: 'Settings', schema: 'personal' },
        'language',
        {
          type: sequelize.DataTypes.STRING,
          allowNull: true,
          defaultValue: 'nl_BE',
        },
        { transaction: t },
      );
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.removeColumn({ tableName: 'Settings', schema: 'personal' }, 'language', {
        transaction: t,
      });
    });
  },
};
