'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.bulkDelete(
        { tableName: 'Teams', schema: 'public' },
        null,
        { transaction: t, truncate: true, cascade: true }
      );

      await queryInterface.bulkDelete(
        { tableName: 'Roles', schema: 'security' },
        null,
        { transaction: t, truncate: true, cascade: true }
      );

      await queryInterface.bulkDelete(
        { tableName: 'EventCompetitions', schema: 'event' },
        null,
        { transaction: t, truncate: true, cascade: true }
      );
      await queryInterface.bulkDelete(
        { tableName: 'EventTournaments', schema: 'event' },
        null,
        { transaction: t, truncate: true, cascade: true }
      );
      await queryInterface.bulkDelete(
        { tableName: 'Games', schema: 'event' },
        null,
        { transaction: t, truncate: true, cascade: true }
      );

      await queryInterface.addConstraint(
        {
          tableName: 'Teams',
          schema: 'public'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['name', 'clubId', 'teamNumber'],
          type: 'unique',
          name: 'teams_unique_constraint',
          transaction: t
        }
      );

      await queryInterface.addIndex(
        {
          tableName: 'Teams',
          schema: 'public'
        },
        {
          fields: ['clubId'],
          name: 'teams_club_index',
          transaction: t
        }
      );
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeConstraint(
        {
          tableName: 'Teams',
          schema: 'public'
        },
        'teams_unique_constraint',
        { transaction: t }
      );
      await queryInterface.removeIndex(
        {
          tableName: 'Teams',
          schema: 'public'
        },
        'teams_club_index',
        { transaction: t }
      );
    });
  }
};
