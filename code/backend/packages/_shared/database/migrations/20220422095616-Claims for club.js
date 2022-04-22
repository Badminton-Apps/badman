/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';
const { Op } = require('sequelize');

const personal = [
  'd9dedca1-537c-4367-b54e-2505a142b509',
  'details:player',
  'Can view (GPDR) details of a player for this club',
  'player',
];

const team = [
  'e1560346-606e-423b-aa8b-f35fbe3f9155',
  'details:team',
  'Can view (GPDR) details of a team for this club',
  'team',
];

const newAdminClaims = [
  [
    'fe646d91-4bca-4bc3-a28d-3f54d2943778',
    'details-any:team',
    'Can view (GPDR) details of any team',
    'team',
  ],
];

module.exports = {
  up: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.bulkInsert(
          { tableName: 'Claims', schema: 'security' },
          [personal, team].map((claimName) => {
            return {
              id: claimName[0],
              name: claimName[1],
              description: claimName[2],
              category: claimName[3],
              createdAt: new Date(),
              updatedAt: new Date(),
              type: 'CLUB',
            };
          }),
          {
            transaction: t,
            ignoreDuplicates: true,
          }
        );

        await queryInterface.bulkInsert(
          { tableName: 'Claims', schema: 'security' },
          newAdminClaims.map((claimName) => {
            return {
              id: claimName[0],
              name: claimName[1],
              description: claimName[2],
              category: claimName[3],
              updatedAt: new Date(),
              createdAt: new Date(),
              type: 'GLOBAL',
            };
          }),
          {
            transaction: t,
            ignoreDuplicates: true,
            returning: ['id'],
          }
        );

        const [adminRoles] = await queryInterface.sequelize.query(
          `select id from "security"."Roles" where "name" = 'Admin'`,
          { transaction: t }
        );

        await queryInterface.bulkInsert(
          { tableName: 'RoleClaimMemberships', schema: 'security' },
          adminRoles.map((admin) => {
            return {
              roleId: admin['id'],
              claimId: personal[0],
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          }),
          {
            transaction: t,
            ignoreDuplicates: true,
          }
        );
        await queryInterface.bulkInsert(
          { tableName: 'RoleClaimMemberships', schema: 'security' },
          adminRoles.map((admin) => {
            return {
              roleId: admin['id'],
              claimId: team[0],
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          }),
          {
            transaction: t,
            ignoreDuplicates: true,
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
        await queryInterface.bulkDelete(
          { tableName: 'RoleClaimMemberships', schema: 'security' },
          { claimId: personal[0] },
          { transaction: t }
        );
        await queryInterface.bulkDelete(
          { tableName: 'RoleClaimMemberships', schema: 'security' },
          { claimId: team[0] },
          { transaction: t }
        );

        await queryInterface.bulkDelete(
          { tableName: 'Claims', schema: 'security' },
          {
            id: {
              [Op.in]: [personal, team, ...newAdminClaims].map(
                (claimName) => claimName[0]
              ),
            },
          },
          { transaction: t }
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
