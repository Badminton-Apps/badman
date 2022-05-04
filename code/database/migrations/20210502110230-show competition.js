'use strict';

const { Op } = require('sequelize');


module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.addColumn(
        {
          tableName: 'EventCompetitions',
          schema: 'event'
        },
        'started',
        {
          type: sequelize.DataTypes.BOOLEAN,
          defaultValue: false
        },
        { transaction: t }
      );
      await queryInterface.bulkUpdate(
        { tableName: 'EventCompetitions', schema: 'event' },
        {
          started: true
        },
        {
          startYear: {
            [Op.lte]: 2020
          }
        },
        {
          transaction: t
        }
      );
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeColumn(
        {
          tableName: 'EventCompetitions',
          schema: 'event'
        },
        'started',
        { transaction: t }
      );
    });
  }
};
