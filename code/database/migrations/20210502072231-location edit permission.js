'use strict';
const editRole = 'eab465d6-749a-4595-ad03-3c2fe3c31020';

module.exports = {
  up: async (queryInterface, sequelize) => {

    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.bulkInsert(
        { tableName: 'Claims', schema: 'security' },
        [
          {
            id: editRole,
            name: `edit:location`,
            description: 'Edit a location',
            category: 'club',
            updatedAt: new Date(),
            createdAt: new Date(),
            type: 'club'
          }
        ],
        {
          transaction: t
        }
      );

      const [
        adminRoles
      ] = await queryInterface.sequelize.query(
        `SELECT * FROM security."Roles" WHERE name = 'Admin' ;`,
        { transaction: t }
      );



      await queryInterface.bulkInsert(
        { tableName: 'RoleClaimMemberships', schema: 'security' },
        adminRoles.map(r => {
          return {
            roleId: r.id,
            claimId: editRole,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        }),
        {
          transaction: t
        }
      );
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.bulkDelete(
        { tableName: 'Claims', schema: 'security' },
        [
          {
            id: editRole
          }
        ],
        {
          transaction: t
        }
      );
      await queryInterface.bulkDelete(
        { tableName: 'RoleClaimMemberships', schema: 'security' },
        [
          {
            roleId: editRole
          }
        ],
        {
          transaction: t
        }
      );
    });
  }
};
