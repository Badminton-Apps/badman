/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const { query } = require('express');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.addColumn(
        {
          tableName: 'Teams',
          schema: 'public',
        },
        'preferredTime2',
        {
          type: sequelize.DataTypes.TIME,
          allowNull: true,
        },
        { transaction: t },
      );
      await queryInterface.addColumn(
        {
          tableName: 'Teams',
          schema: 'public',
        },
        'preferredDay2',
        {
          type: sequelize.DataTypes.ENUM(
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
            'sunday',
          ),
          allowNull: true,
        },
        { transaction: t },
      );
      try {
      } catch (err) {
        console.error('We errored with', err?.message ?? err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.removeColumn(
          {
            tableName: 'Teams',
            schema: 'public',
          },
          'preferredTime2',
          { transaction: t },
        );
        await queryInterface.removeColumn(
          {
            tableName: 'Teams',
            schema: 'public',
          },
          'preferredDay2',
          { transaction: t },
        );

        await queryInterface.sequelize.query(`DROP TYPE "enum_public_Teams_preferredDay2";`, {
          transaction: t,
        });
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
