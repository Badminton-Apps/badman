'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.bulkInsert(
        { tableName: 'Claims', schema: 'security' },
        [
          {
            id: '067e0347-b724-481d-b097-81ba5cb2d629',
            name: `remove:club`,
            description: 'Delete a club',
            category: 'club',
            updatedAt: new Date(),
            createdAt: new Date(),
            type: 'global'
          }
        ],
        {
          transaction: t
        }
      );

      await queryInterface.bulkUpdate(
        { tableName: 'Claims', schema: 'security' },
        {
          category: 'club'
        },
        {
          category: 'clubs',
          type: 'global'
        },
        {
          transaction: t
        }
      );
    });
  },

  down: async (queryInterface, sequelize) => {
    await queryInterface.bulkDelete(
      { tableName: 'Claims', schema: 'security' },
      [
        {
          id: '067e0347-b724-481d-b097-81ba5cb2d629'
        }
      ],
      {
        transaction: t
      }
    );

    await queryInterface.bulkUpdate(
      { tableName: 'Claims', schema: 'security' },
      {
        category: 'clubs'
      },
      {
        category: 'club',
        type: 'global'
      },
      {
        transaction: t
      }
    );
  }
};
