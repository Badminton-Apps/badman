'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.addColumn(
        {
          tableName: 'Clubs',
          schema: 'public'
        },
        'fullName',
        { type: sequelize.DataTypes.STRING },
        { transaction: t }
      );

      await queryInterface.addColumn(
        {
          tableName: 'Clubs',
          schema: 'public'
        },
        'useForTeamName',
        {
          type: sequelize.ENUM('name', 'fullName', 'abbreviation'),
          defaultValue: 'name'
        },
        { transaction: t }
      );

      await queryInterface.removeConstraint(
        {
          tableName: 'Clubs',
          schema: 'public'
        },
        'Clubs_name_key',
        {
          transaction: t
        }
      );

      await queryInterface.addConstraint(
        {
          tableName: 'Clubs',
          schema: 'public'
        },
        {
          fields: ['name', 'clubId'],
          type: 'unique',
          unique: true,
          name: 'club_number_unique',
          transaction: t
        }
      );
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeColumn(
        {
          tableName: 'Clubs',
          schema: 'public'
        },
        'fullName',
        { transaction: t }
      );

      await queryInterface.removeColumn(
        {
          tableName: 'Clubs',
          schema: 'public'
        },
        'useForTeamName',
        { transaction: t }
      );

      await queryInterface.removeConstraint(
        {
          tableName: 'Clubs',
          schema: 'public'
        },
        'club_number_unique',
        {
          transaction: t
        }
      );

      await queryInterface.addConstraint(
        {
          tableName: 'Clubs',
          schema: 'public'
        },
        {
          fields: ['name'],
          type: 'unique',
          unique: true,
          name: 'Clubs_name_key' ,
          transaction: t
        }
      );
    });
  }
};
