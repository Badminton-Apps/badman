'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.changeColumn(
          {
            schema: 'security',
            tableName: 'Claims',
          },
          'type',
          {
            type: sequelize.TEXT,
          },
          { transaction: t }
        );

        await queryInterface.sequelize.query(
          'DROP TYPE IF EXISTS "security"."enum_Claims_type";',
          {
            transaction: t,
          }
        );

        await queryInterface.sequelize.query(
          `update "security"."Claims" set "type" = 'GLOBAL' where "type" = 'global'`,
          { transaction: t }
        );
        await queryInterface.sequelize.query(
          `update "security"."Claims" set "type" = 'CLUB' where "type" = 'club'`,
          { transaction: t }
        );
        await queryInterface.sequelize.query(
          `update "security"."Claims" set "type" = 'TEAM' where "type" = 'team'`,
          { transaction: t }
        );

        

        await queryInterface.changeColumn(
          {
            schema: 'security',
            tableName: 'Claims',
          },
          'type',
          {
            type: sequelize.ENUM('GLOBAL', 'CLUB', 'TEAM'),
          },
          { transaction: t }
        );

     
        await queryInterface.addColumn(
          {
            schema: 'security',
            tableName: 'Roles',
          },
          'type',
          {
            type: sequelize.ENUM('GLOBAL', 'CLUB', 'TEAM'),
          },
          { transaction: t }
        );

        // By this point all roles were made for club level
        await queryInterface.sequelize.query(
          `update "security"."Roles" set "type" = 'CLUB'`,
          { transaction: t }
        );


      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.changeColumn(
          {
            schema: 'security',
            tableName: 'Claims',
          },
          'type',
          {
            type: sequelize.TEXT,
          },
          { transaction: t }
        );
        await queryInterface.sequelize.query(
          'DROP TYPE IF EXISTS "security"."enum_Claims_type";',
          {
            transaction: t,
          }
        );

        await queryInterface.sequelize.query(
          `update "security"."Claims" set "type" = 'global' where "type" = 'GLOBAL'`,
          { transaction: t }
        );
        await queryInterface.sequelize.query(
          `update "security"."Claims" set "type" = 'club' where "type" = 'CLUB'`,
          { transaction: t }
        );
        await queryInterface.sequelize.query(
          `update "security"."Claims" set "type" = 'team' where "type" = 'TEAM'`,
          { transaction: t }
        );

        await queryInterface.changeColumn(
          {
            schema: 'security',
            tableName: 'Claims',
          },
          'type',
          {
            type: sequelize.ENUM('global', 'club', 'team'),
          },
          { transaction: t }
        );

        await queryInterface.removeColumn(
          {
            schema: 'security',
            tableName: 'Roles',
          },
          'type',
          { transaction: t }
        );

        await queryInterface.sequelize.query(
          'DROP TYPE IF EXISTS "security"."enum_Roles_type";',
          {
            transaction: t,
          }
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
