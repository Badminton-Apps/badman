/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';


module.exports = {
  up: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.addConstraint(
          {
            tableName: 'Availabilities',
            schema: 'event'
          },
          {
            onDelete: 'cascade',
            onUpdate: 'cascade',
            fields: ['year', 'locationId'],
            type: 'unique',
            name: 'availability_unique_constraint',
            transaction: t
          }
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.removeConstraint(
          {
            tableName: 'Availabilities',
            schema: 'event'
          },
          'availability_unique_constraint',
          { transaction: t }
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
