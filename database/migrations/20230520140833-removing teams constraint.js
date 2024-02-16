/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // remove the constraint on the teams table teams_unique_constraint
        await queryInterface.removeConstraint('Teams', 'teams_unique_constraint', {
          transaction: t,
        });
      } catch (err) {
        console.error('We errored with', err?.message ?? err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      // add the constraint on the teams table teams_unique_constraint
      await queryInterface.addConstraint('Teams', {
        fields: ['clubId', 'season', 'type', 'teamNumber'],
        type: 'unique',
        name: 'teams_unique_constraint',
        transaction: t,
      });

      try {
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
