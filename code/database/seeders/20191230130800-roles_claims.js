'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.sequelize.query(
        `TRUNCATE TABLE security."Claims" CASCADE;`,
        { transaction: t }
      );

      const globalClaims = [
        ['add', 'club', 'Create new club', 'club', 'GLOBAL'],
        [`remove`, `club`, 'Delete a club', 'club', 'GLOBAL'],
        ['edit-any', 'club', 'Edit any club', 'club', 'GLOBAL'],
        ['add-any', 'role', 'Add any role to club', 'club', 'GLOBAL'],
        ['edit-any', 'role', 'Edits any role of club', 'club', 'GLOBAL'],
        ['remove-any', 'role', 'edits any role of club', 'club', 'GLOBAL'],
        ['add', 'competition', 'Add an competition', 'competition', 'GLOBAL'],
        ['edit', 'competition', 'Edit an competition', 'competition', 'GLOBAL'],
        [
          'delete',
          'competition',
          'Delete an competition',
          'competition',
          'GLOBAL',
        ],
        [
          'import',
          'competition',
          'Import an competition',
          'competition',
          'GLOBAL',
        ],

        
        ['link', 'player', 'Can link players to login', 'player', 'GLOBAL'],
        ['add', 'player', 'Manually add player', 'player', 'GLOBAL'],
        ['merge', 'player', 'Can merge players', 'player', 'GLOBAL'],
        ['delete', 'player', 'Can delete players', 'player', 'GLOBAL'],
        ['edit-any', 'player', 'Can edit any player', 'player', 'GLOBAL'],
        [
          'subscription',
          'player',
          'Can change the subscription (login) of player',
          'player',
          'GLOBAL',
        ],
        [
          'membership',
          'club',
          'Can change the membership of player',
          'player',
          'GLOBAL',
        ],
        [
          'status',
          'competition',
          'Can change competition status',
          'player',
          'GLOBAL',
        ],
        ['edit', 'ranking', 'Can change ranking of player', 'player', 'GLOBAL'],
        [
          'details-any',
          'player',
          'Can view (GPDR) details of any player',
          'player',
          'GLOBAL',
        ],

        ['change-base', 'team', 'Can change base players', 'team', 'GLOBAL'],

        [
          'add',
          'event',
          'Add subevent(s) to ranking group',
          'ranking-group',
          'GLOBAL',
        ],
        [
          'remove',
          'event',
          'Remove subevent(s) to ranking group',
          'ranking-group',
          'GLOBAL',
        ],

        ['view', 'ranking', 'View ranking system', 'ranking', 'GLOBAL'],
        ['add', 'ranking', 'Add ranking system', 'ranking', 'GLOBAL'],
        ['edit', 'ranking', 'Edit ranking system', 'ranking', 'GLOBAL'],
        ['delete', 'ranking', 'Delete ranking system', 'ranking', 'GLOBAL'],
        ['calculate', 'ranking', 'Simulate ranking', 'ranking', 'GLOBAL'],
        [
          'make-primary',
          'ranking',
          'Make ranking system primary',
          'ranking',
          'GLOBAL',
        ],
        ['add', 'claims', 'Edit claims', 'security', 'GLOBAL'],
        ['edit', 'claims', 'Edit GLOBAL claims', 'security', 'GLOBAL'],
        [
          'delete-any',
          'tournament',
          'Delete tournament',
          'tournament',
          'GLOBAL',
        ],
        [
          'edit-any',
          'tournament',
          'Edit any tournament',
          'tournament',
          'GLOBAL',
        ],

        ['change', 'job', 'Start stop jobs', 'job', 'GLOBAL'],

        [
          'enlist-any',
          'team',
          'Enlist any team in to competition',
          'enlist',
          'GLOBAL',
        ],
        [
          'delete-any',
          'team',
          'Allows the deletion of a team',
          'team',
          'GLOBAL',
        ],

        [
          'details-any',
          'team',
          'Can view (GPDR) details of any team',
          'team',
          'GLOBAL',
        ],
        ['view', 'entries', 'Can view the entries', 'competition', 'GLOBAL'],
        [
          'change-any',
          'encounter',
          'Change the date/time of a encounter',
          'event',
          'GLOBAL',
        ],
      ];

      const clubClaims = [
        ['edit', 'club', 'Edit club', 'club', 'CLUB'],
        ['edit', 'location', 'Edits a location from a club', 'club', 'CLUB'],
        ['add', 'location', 'Adds location to club', 'club', 'CLUB'],
        ['remove', 'location', 'Remove location to club', 'club', 'CLUB'],
        ['add', 'player', 'Adds player to club', 'club', 'CLUB'],
        ['remove', 'player', 'Removes player to club', 'club', 'CLUB'],
        ['add', 'role', 'Adds role to club', 'club', 'CLUB'],
        ['edit', 'role', 'Edits role of club', 'club', 'CLUB'],
        ['remove', 'role', 'Removes rol of club', 'club', 'CLUB'],
        ['add', 'tournament', 'Add any tournament', 'competition', 'CLUB'],
        ['edit', 'tournament', 'Edit tournament', 'tournament', 'CLUB'],
        ['delete', 'tournament', 'Delete tournament', 'tournament', 'CLUB'],
        [
          'details',
          'player',
          'Can view (GPDR) details of a player for this club',
          'player',
          'CLUB',
        ],
        [
          'details',
          'team',
          'Can view (GPDR) details of a team for this club',
          'team',
          'CLUB',
        ],
      ];

      const teamClaims = [
        ['enter', 'results', 'Enters competition results', 'club', 'TEAM'],
        ['edit', 'team', 'Edit competition team', 'club', 'TEAM'],
        ['add', 'team', 'Adds competition team to club', 'club', 'TEAM'],
        ['enlist', 'team', 'Enlists competition team', 'enlist', 'TEAM'],
        [
          'change',
          'encounter',
          'Change the date/time of a encounter',
          'event',
          'TEAM',
        ],
      ];

      console.log('Creating global claims');
      await queryInterface.bulkInsert(
        { tableName: 'Claims', schema: 'security' },
        globalClaims.map((claim) => {
          if (!claim || claim.length !== 5) {
            console.error('Invalid claim', claim, globalClaims.indexOf(claim));
          }

          return {
            id: uuidv4(),
            name: `${claim[0]}:${claim[1]}`,
            description: claim[2],
            category: claim[3],
            updatedAt: new Date(),
            createdAt: new Date(),
            type: claim[4].toUpperCase(),
          };
        }),
        {
          transaction: t,
        }
      );

      console.log('Creating club claims');
      await queryInterface.bulkInsert(
        { tableName: 'Claims', schema: 'security' },
        clubClaims.map((claim) => {
          if (!claim || claim.length !== 5) {
            console.error('Invalid claim', claim, globalClaims.indexOf(claim));
          }
          return {
            id: uuidv4(),
            name: `${claim[0]}:${claim[1]}`,
            description: claim[2],
            category: claim[3],
            updatedAt: new Date(),
            createdAt: new Date(),
            type: claim[4].toUpperCase(),
          };
        }),
        {
          transaction: t,
        }
      );

      console.log('Creating team claims');
      await queryInterface.bulkInsert(
        { tableName: 'Claims', schema: 'security' },
        teamClaims.map((claim) => {
          if (!claim || claim.length !== 5) {
            console.error('Invalid claim', claim, globalClaims.indexOf(claim));
          }
          return {
            id: uuidv4(),
            name: `${claim[0]}:${claim[1]}`,
            description: claim[2],
            category: claim[3],
            updatedAt: new Date(),
            createdAt: new Date(),
            type: claim[4].toUpperCase(),
          };
        }),
        {
          transaction: t,
        }
      );
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.sequelize.query(
        `TRUNCATE TABLE security."Claims" CASCADE;`,
        { transaction: t }
      );
    });
  },
};
