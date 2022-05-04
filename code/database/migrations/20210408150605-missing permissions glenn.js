'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      const globalClaims = [
        [
          'f3c6e715-86ba-484a-b2ee-40bdc9938ac4',
          'add',
          'club',
          'Create new club',
          'clubs',
          'global'
        ],
        [
          '35c1c77a-0a1a-4e4b-8d13-54b69650db8a',
          'edit-any',
          'club',
          'Edit any club',
          'clubs',
          'global'
        ],
        [
          'b92d0798-f8f4-4d1a-b35c-b9b02c9195e5',
          'add-any',
          'role',
          'Add any role to club',
          'clubs',
          'global'
        ],
        [
          'f64a23ae-e2e8-48ce-beb9-cb823d86d299',
          'edit-any',
          'role',
          'Edits any role of club',
          'clubs',
          'global'
        ],
        [
          'a90e5d8e-0ffc-428b-b73f-398142c49995',
          'remove-any',
          'role',
          'edits any role of club',
          'clubs',
          'global'
        ],
        [
          '8c38a508-7f33-407f-ab44-56e029c829d4',
          'add',
          'competition',
          'Add an competition',
          'competitions',
          'global'
        ],
        [
          'a12e9ce5-a3a3-4175-9e08-c18a3a78bf00',
          'edit',
          'competition',
          'Edit an competition',
          'competitions',
          'global'
        ],
        [
          '60bbef73-6178-4a55-9705-519f9498e33d',
          'delete',
          'competition',
          'Delete an competition',
          'competitions',
          'global'
        ],
        [
          '99c4f768-d4aa-4c26-a317-4caf89088c40',
          'import',
          'competition',
          'Import an competition',
          'competitions',
          'global'
        ],
        [
          '7c6f5d2b-b47e-4611-8fe8-409c0080fd48',
          'link',
          'player',
          'Can link players to login',
          'player',
          'global'
        ],
        [
          'e28e7d61-68a6-42c6-b00a-cc76f33c2704',
          'add',
          'player',
          'Manually add player',
          'player',
          'global'
        ],
        [
          'b68d1014-c6d7-4fbe-8d57-356a5286b922',
          'view',
          'ranking',
          'View ranking system',
          'ranking',
          'global'
        ],
        [
          '4cf1254b-1414-48c7-ba16-3625794e8de2',
          'add',
          'ranking',
          'Add ranking system',
          'ranking',
          'global'
        ],
        [
          '329fa806-3dae-4919-8e37-58116cbfe302',
          'edit',
          'ranking',
          'Edit ranking system',
          'ranking',
          'global'
        ],
        [
          'b5466909-fd64-4b2d-bcf7-edc89f814782',
          'delete',
          'ranking',
          'Delete ranking system',
          'ranking',
          'global'
        ],
        [
          'c702c0dc-e477-46ed-8fcd-779d0a6d75a6',
          'calculate',
          'ranking',
          'Simulate ranking',
          'ranking',
          'global'
        ],
        [
          'ab6b364c-bdc2-43b4-a73e-7624d1e732d2',
          'make-primary',
          'ranking',
          'Make ranking system primary',
          'ranking',
          'global'
        ],
        [
          'a3ff1ff1-08f6-427d-8bf5-f1de9f092dd7',
          'add',
          'claims',
          'Edit claims',
          'security',
          'global'
        ],
        [
          '79df8b06-e2db-4664-ba39-e90c7e1a457e',
          'edit',
          'claims',
          'Edit global claims',
          'security',
          'global'
        ],
        [
          '4a500904-5011-4319-8ed9-0465b5619ddc',
          'delete-any',
          'tournament',
          'Delete tournament',
          'tournaments',
          'global'
        ],
        [
          '7a5ca972-ab4d-4b3e-b933-8b484bf991c0',
          'edit-any',
          'tournament',
          'Edit any tournament',
          'tournaments',
          'global'
        ]
      ];

      const clubClaims = [
        [
          '101e08de-3723-464d-97ef-fd191db52b29',
          'edit',
          'club',
          'Edit club',
          'clubs',
          'club'
        ],
        [
          '3350dc5a-5c7a-4aa4-8b16-12b226794ec8',
          'add',
          'location',
          'Adds location to club',
          'clubs',
          'club'
        ],
        [
          '11c88e3b-767a-4831-add1-c7767cece340',
          'remove',
          'location',
          'Remove location to club',
          'clubs',
          'club'
        ],
        [
          '6d0d0157-52cc-4399-ba1c-82f7c5e47913',
          'add',
          'player',
          'Adds player to club',
          'clubs',
          'club'
        ],
        [
          'f3ed1349-0057-4eb6-876f-a48702c17746',
          'remove',
          'player',
          'Removes player to club',
          'clubs',
          'club'
        ],
        [
          '695cd690-f4ec-402c-a5a4-1ee94d9f80bd',
          'add',
          'role',
          'Adds role to club',
          'clubs',
          'club'
        ],
        [
          '83e39acc-6502-4afd-9e3f-c5f878959672',
          'edit',
          'role',
          'Edits role of club',
          'clubs',
          'club'
        ],
        [
          '6b9e9b70-82b4-49f1-95ca-a170ab0df6fa',
          'remove',
          'role',
          'Removes rol of club',
          'clubs',
          'club'
        ],
        [
          '94180090-db8f-4925-b22c-26e49b43e8fe',
          'add',
          'tournament',
          'Add any tournament',
          'competitions',
          'club'
        ],
        [
          'e12be5bd-25a0-4994-9109-126089e8526d',
          'edit',
          'tournament',
          'Edit tournament',
          'tournaments'
        ],
        [
          'f3f2407e-c266-443c-9c10-e48e68925951',
          'delete',
          'tournament',
          'Delete tournament',
          'tournaments',
          'club'
        ]
      ];

      const teamClaims = [
        [
          '2e00f008-795b-45f6-8690-1b70d5b91cb7',
          'enter',
          'results',
          'Enters competition results',
          'clubs',
          'team'
        ],
        [
          'b65535d3-c191-4870-9cf0-095f17ad689d',
          'edit',
          'team',
          'Edit competition team',
          'clubs',
          'team'
        ],
        [
          'a416b0dd-1395-4eac-9524-e754c3c18487',
          'add',
          'team',
          'Adds competition team to club',
          'clubs',
          'team'
        ],
        [
          'db0c0b2e-dee7-48c6-b7ff-e8726486714d',
          'enlist',
          'team',
          'Enlists competition team',
          'clubs',
          'team'
        ]
      ];

      await queryInterface.bulkDelete(
        { tableName: 'PlayerClaimMemberships', schema: 'security' },
        null,
        { transaction: t, truncate: true }
      );
      await queryInterface.bulkDelete(
        { tableName: 'RoleClaimMemberships', schema: 'security' },
        null,
        { transaction: t, truncate: true }
      );
      await queryInterface.bulkDelete(
        { tableName: 'PlayerRoleMemberships', schema: 'security' },
        null,
        { transaction: t, truncate: true }
      );
      await queryInterface.bulkDelete(
        { tableName: 'Claims', schema: 'security' },
        null,
        { transaction: t, truncate: true, cascade: true }
      );

      const globalClaimsJson = globalClaims.map(claimName => {
        return {
          id: claimName[0],
          name: `${claimName[1]}:${claimName[2]}`,
          description: claimName[3],
          category: claimName[4],
          updatedAt: new Date(),
          createdAt: new Date(),
          type: claimName[5]
        };
      });

      await queryInterface.bulkInsert(
        { tableName: 'Claims', schema: 'security' },
        globalClaimsJson,
        {
          transaction: t
        }
      );

      await queryInterface.bulkInsert(
        { tableName: 'Claims', schema: 'security' },
        clubClaims.map(claimName => {
          return {
            id: claimName[0],
            name: `${claimName[1]}:${claimName[2]}`,
            description: claimName[3],
            category: claimName[4],
            updatedAt: new Date(),
            createdAt: new Date(),
            type: claimName[5]
          };
        }),
        {
          transaction: t,
          ignoreDuplicates: true
        }
      );

      await queryInterface.bulkInsert(
        { tableName: 'Claims', schema: 'security' },
        teamClaims.map(claimName => {
          return {
            id: claimName[0],
            name: `${claimName[1]}:${claimName[2]}`,
            description: claimName[3],
            category: claimName[4],
            updatedAt: new Date(),
            createdAt: new Date(),
            type: claimName[5]
          };
        }),
        {
          transaction: t,
          ignoreDuplicates: true
        }
      );

      const player = {
        id: '90fcc155-3952-4f58-85af-f90794165c89',
        gender: 'M',
        firstName: 'Glenn',
        lastName: 'Latomme',
        memberId: '50104197',
        sub: 'auth0|5e81ca9e8755df0c7f7452ea',
        updatedAt: new Date(),
        createdAt: new Date()
      };
      await queryInterface.bulkInsert(
        { tableName: 'Players', schema: 'public' },
        [player],
        {
          transaction: t,
          ignoreDuplicates: true,
          returning: ['id']
        }
      );

      await queryInterface.bulkInsert(
        { tableName: 'PlayerClaimMemberships', schema: 'security' },
        globalClaimsJson.map(r => {
          return {
            claimId: r.id,
            userId: player.id,
            updatedAt: new Date(),
            createdAt: new Date()
          };
        }),
        {
          transaction: t,
          ignoreDuplicates: true
        }
      );
    });
  },

  down: async (queryInterface, sequelize) => {
    //
  }
};
