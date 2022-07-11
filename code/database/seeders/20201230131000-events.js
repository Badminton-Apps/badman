'use strict';
const { v4: uuidv4 } = require('uuid');
const jsonEvents = require('./events.json');

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.sequelize.query(
        `TRUNCATE TABLE event."EventTournaments" cascade;`,
        { transaction: t }
      );
      await queryInterface.sequelize.query(
        `TRUNCATE TABLE event."EventCompetitions" cascade;`,
        { transaction: t }
      );

      console.log('Creating tournaments');
      await queryInterface.bulkInsert(
        { tableName: 'EventTournaments', schema: 'event' },
        jsonEvents.tournaments.map((t) => {
          return {
            id: uuidv4(),
            createdAt: new Date(),
            updatedAt: new Date(),
            ...t,
          };
        }),
        {
          transaction: t,
        }
      );

      console.log('Creating competitions');
      await queryInterface.bulkInsert(
        { tableName: 'EventCompetitions', schema: 'event' },
        jsonEvents.competitions.map((c) => {
          return {
            id: uuidv4(),
            createdAt: new Date(),
            updatedAt: new Date(),
            ...c,
          };
        }),
        {
          transaction: t,
        }
      );
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.sequelize.query(
        `TRUNCATE TABLE security."Claims" CASCADE;`,
        { transaction: t }
      );
    });
  },
};
