'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      try {
        /*
        For some reason we get for Competition 
        */
        console.log('Fixing limburg');

        const eventId = await queryInterface.rawSelect(
          {
            tableName: 'EventCompetitions',
            schema: 'event'
          },
          {
            where: {
              name: 'Competitie Badminton Limburg 2016-2017'
            }
          },
          ['id']
        );

        if (eventId) {
          await queryInterface.bulkUpdate(
            { tableName: 'SubEventCompetitions', schema: 'event' },
            { visualCode: '10' }, // update
            {
              eventId: eventId,
              name: '1 ste',
              eventType: 'MX'
            }, // where
            {
              transaction: t
            }
          );
          await queryInterface.bulkUpdate(
            { tableName: 'SubEventCompetitions', schema: 'event' },
            { visualCode: '13' }, // update
            {
              eventId: eventId,
              name: '2 de',
              eventType: 'MX'
            }, // where
            {
              transaction: t
            }
          );
          await queryInterface.bulkUpdate(
            { tableName: 'SubEventCompetitions', schema: 'event' },
            { visualCode: '14' }, // update
            {
              eventId: eventId,
              name: '3 de',
              eventType: 'MX'
            }, // where
            {
              transaction: t
            }
          );
          await queryInterface.bulkUpdate(
            { tableName: 'SubEventCompetitions', schema: 'event' },
            { visualCode: '15' }, // update
            {
              eventId: eventId,
              name: '4 de',
              eventType: 'MX'
            }, // where
            {
              transaction: t
            }
          );
          await queryInterface.bulkUpdate(
            { tableName: 'SubEventCompetitions', schema: 'event' },
            { visualCode: '19' }, // update
            {
              eventId: eventId,
              name: '2 de',
              eventType: 'F'
            }, // where
            {
              transaction: t
            }
          );
        }
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      try {
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  }
};
