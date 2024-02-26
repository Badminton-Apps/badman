/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        console.log('Creating EXTENSION');
        // create system schema
        await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

        console.log('Creating SCHEMA');
        await queryInterface.createSchema('system', { transaction: t });

        console.log('Creating TABLE');
        await queryInterface.createTable(
          {
            tableName: 'Services',
            schema: 'system',
          },
          {
            id: {
              primaryKey: true,
              type: sequelize.UUID,
              allowNull: false,
              defaultValue: sequelize.fn('uuid_generate_v4'),
            },
            name: {
              type: sequelize.DataTypes.STRING,
              allowNull: false,
            },
            status: {
              type: sequelize.DataTypes.STRING,
              allowNull: false,
            },
            renderId: {
              type: sequelize.DataTypes.STRING,
              allowNull: true,
            },
            createdAt: {
              type: sequelize.DataTypes.DATE,
              allowNull: false,
              defaultValue: sequelize.fn('NOW'),
            },
            updatedAt: {
              type: sequelize.DataTypes.DATE,
              allowNull: false,
              defaultValue: sequelize.fn('NOW'),
            },
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
      try {
        await queryInterface.dropTable({
          tableName: 'Services',
          schema: 'system',
        });
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
