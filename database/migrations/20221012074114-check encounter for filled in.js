/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        // expand encounter with scores entered and scores accepted columns
        await queryInterface.addColumn(
          { tableName: 'EventCompetitions', schema: 'event' },
          'checkEncounterForFilledIn',
          {
            type: sequelize.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          { transaction: t },
        );
      } catch (err) {
        console.error('We errored with', err?.message ?? err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      // drop encounter accepted column
      await queryInterface.removeColumn(
        { tableName: 'EventCompetitions', schema: 'event' },
        'checkEncounterForFilledIn',
        { transaction: t },
      );

      try {
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
