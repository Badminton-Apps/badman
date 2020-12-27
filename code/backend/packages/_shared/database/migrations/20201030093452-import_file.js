/* eslint-disable no-console */
'use strict';

module.exports = {
  up: (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      const promise = Promise.all([
        queryInterface.removeColumn('Events', 'fileName'),
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
  },

  down: (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      const promise = Promise.all([
        queryInterface.addColumn('Events', 'fileName', {
          type: sequelize.DataTypes.STRING
        }),
        queryInterface.sequelize.query('DROP Table "import.files"; DROP TYPE IF EXISTS "enum_import.files_type";', {
          transaction: t, schema: 'public'
        })
      ]);
      promise.catch(err => {
        console.error('Failed migration', err);
      });

      return promise;
    });
  }
};
