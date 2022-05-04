'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.bulkInsert(
        { tableName: 'Claims', schema: 'security' },
        [
          {
            id: '93000e2a-11bc-4662-aae5-dff8ac4439e6',
            name: `remove:role`,
            description: 'Delete a role from a club',
            category: 'club',
            updatedAt: new Date(),
            createdAt: new Date(),
            type: 'club'
          }
        ],
        {
          transaction: t
        }
      );
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.bulkDelete(
        { tableName: 'Claims', schema: 'security' },
        [
          {
            id: '93000e2a-11bc-4662-aae5-dff8ac4439e6'
          }
        ],
        {
          transaction: t
        }
      );
    });
  }
};
