/* eslint-disable no-console */
'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      const promise = Promise.all([
        queryInterface.createSchema('import', { transaction: t }),
        queryInterface.createTable(
          'Files',
          {
            id: {
              type: sequelize.DataTypes.INTEGER,
              primaryKey: true,
              autoIncrement: true
            },
            createdAt: {
              type: sequelize.DataTypes.DATE
            },
            updatedAt: {
              type: sequelize.DataTypes.DATE
            },
            dates: {
              type: sequelize.DataTypes.STRING
            },
            firstDay: {
              type: sequelize.DataTypes.DATE
            },
            fileLocation: sequelize.DataTypes.STRING,
            name: sequelize.DataTypes.STRING,
            type: sequelize.DataTypes.ENUM(
              'COMPETITION_CP',
              'COMPETITION_XML',
              'TOERNAMENT'
            ),
            linkCode: {
              type: sequelize.DataTypes.STRING
            },
            webID: {
              type: sequelize.DataTypes.STRING
            },
            uniCode: {
              type: sequelize.DataTypes.STRING
            },
            importing: {
              type: sequelize.DataTypes.BOOLEAN,
              defaultValue: false
            }
          },
          { transaction: t, schema: 'import' }
        ),
        queryInterface.dropTable('import.files', {
          transaction: t,
          schema: 'public'
        })
      ]);
      promise.catch(err => {
        console.error('Failed migration', err);
      });

      return promise;
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      const promise = Promise.all([
        queryInterface.dropTable('files', { transaction: t, schema: 'import' }),
        queryInterface.dropSchema('import', {
          transaction: t,
          schema: 'public'
        }),
        queryInterface.createTable(
          'import.files',
          {
            id: {
              type: sequelize.DataTypes.INTEGER,
              primaryKey: true,
              autoIncrement: true
            },
            createdAt: {
              type: sequelize.DataTypes.DATE
            },
            updatedAt: {
              type: sequelize.DataTypes.DATE
            },
            dates: {
              type: sequelize.DataTypes.STRING
            },
            firstDay: {
              type: sequelize.DataTypes.DATE
            },
            fileLocation: sequelize.DataTypes.STRING,
            name: sequelize.DataTypes.STRING,
            type: sequelize.DataTypes.ENUM(
              'COMPETITION_CP',
              'COMPETITION_XML',
              'TOERNAMENT'
            ),
            linkCode: {
              type: sequelize.DataTypes.STRING
            },
            webID: {
              type: sequelize.DataTypes.STRING
            },
            uniCode: {
              type: sequelize.DataTypes.STRING
            },
            importing: {
              type: sequelize.DataTypes.BOOLEAN,
              defaultValue: false
            }
          },
          { transaction: t, schema: 'public' }
        )
      ]);
      promise.catch(err => {
        console.error('Failed migration', err);
      });

      return promise;
    });
  }
};
