'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.bulkUpdate(
        { tableName: 'Players', schema: 'public' },
        {
          gender: 'M1'
        },
        {
          gender: 1
        },
        {
          transaction: t
        }
      );
      await queryInterface.bulkUpdate(
        { tableName: 'Players', schema: 'public' },
        {
          gender: 'M1'
        },
        {
          gender: '1'
        },
        {
          transaction: t
        }
      );

      await queryInterface.bulkUpdate(
        { tableName: 'Players', schema: 'public' },
        {
          gender: 'F1'
        },
        {
          gender: 2
        },
        {
          transaction: t
        }
      );
      await queryInterface.bulkUpdate(
        { tableName: 'Players', schema: 'public' },
        {
          gender: 'F1'
        },
        {
          gender: '2'
        },
        {
          transaction: t
        }
      );
      await queryInterface.bulkUpdate(
        { tableName: 'Players', schema: 'public' },
        {
          gender: 'F1'
        },
        {
          gender: 'V'
        },
        {
          transaction: t
        }
      );
      await queryInterface.bulkUpdate(
        { tableName: 'Players', schema: 'public' },
        {
          gender: 'F1'
        },
        {
          gender: 'D'
        },
        {
          transaction: t
        }
      );
    });
  },

  down: async (queryInterface, sequelize) => {}
};
