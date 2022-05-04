'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.bulkUpdate(
        { tableName: 'Players', schema: 'public' },
        {
          gender: 'M'
        },
        {
          gender: 'M1'
        },
        {
          transaction: t
        }
      );
      
      await queryInterface.bulkUpdate(
        { tableName: 'Players', schema: 'public' },
        {
          gender: 'F'
        },
        {
          gender: 'F1'
        },
        {
          transaction: t
        }
      );
    });
  },

  down: async (queryInterface, sequelize) => {}
};
