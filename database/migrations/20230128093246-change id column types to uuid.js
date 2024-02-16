'use strict';

const tableNames = [
  { schema: 'event', tableName: 'Availabilities' },
  { schema: 'event', tableName: 'Courts' },
  { schema: 'event', tableName: 'DrawCompetitions' },
  { schema: 'event', tableName: 'DrawTournaments' },
  { schema: 'event', tableName: 'EncounterChangeDates' },
  { schema: 'event', tableName: 'EncounterChanges' },
  { schema: 'event', tableName: 'EncounterCompetitions' },
  { schema: 'event', tableName: 'Entries' },
  { schema: 'event', tableName: 'EventCompetitions' },
  { schema: 'event', tableName: 'EventTournaments' },
  { schema: 'event', tableName: 'Games' },
  { schema: 'event', tableName: 'Locations' },
  { schema: 'event', tableName: 'Standings' },
  { schema: 'event', tableName: 'SubEventCompetitions' },
  { schema: 'event', tableName: 'SubEventTournaments' },
  { schema: 'personal', tableName: 'Notifications' },
  { schema: 'personal', tableName: 'Settings' },
  { schema: 'public', tableName: 'ClubPlayerMemberships' },
  { schema: 'public', tableName: 'Clubs' },
  { schema: 'public', tableName: 'Comments' },
  { schema: 'public', tableName: 'Players' },
  { schema: 'public', tableName: 'RequestLinks' },
  { schema: 'public', tableName: 'TeamPlayerMemberships' },
  { schema: 'public', tableName: 'Teams' },
  { schema: 'ranking', tableName: 'RankingLastPlaces' },
  { schema: 'ranking', tableName: 'RankingPlaces' },
  { schema: 'ranking', tableName: 'RankingPoints' },
  { schema: 'ranking', tableName: 'RankingSystems' },
  { schema: 'security', tableName: 'Claims' },
  { schema: 'security', tableName: 'Roles' },
];

const foreignKeys = [
  {
    constraint_name: 'Availabilities_locationId_fkey',
    source_schema: 'event',
    source_table: 'Availabilities',
    source_column: 'locationId',
    target_schema: 'event',
    target_table: 'Locations',
    target_column: 'id',
  },
  {
    constraint_name: 'Courts_locationId_fkey',
    source_schema: 'event',
    source_table: 'Courts',
    source_column: 'locationId',
    target_schema: 'event',
    target_table: 'Locations',
    target_column: 'id',
  },
  {
    constraint_name: 'DrawCompetitions_subeventId_fkey',
    source_schema: 'event',
    source_table: 'DrawCompetitions',
    source_column: 'subeventId',
    target_schema: 'event',
    target_table: 'SubEventCompetitions',
    target_column: 'id',
  },
  {
    constraint_name: 'DrawTournaments_subeventId_fkey',
    source_schema: 'event',
    source_table: 'DrawTournaments',
    source_column: 'subeventId',
    target_schema: 'event',
    target_table: 'SubEventTournaments',
    target_column: 'id',
  },
  {
    constraint_name: 'EncounterChangeDates_encounterChangeId_fkey',
    source_schema: 'event',
    source_table: 'EncounterChangeDates',
    source_column: 'encounterChangeId',
    target_schema: 'event',
    target_table: 'EncounterChanges',
    target_column: 'id',
  },
  {
    constraint_name: 'EncounterChanges_encounterId_fkey',
    source_schema: 'event',
    source_table: 'EncounterChanges',
    source_column: 'encounterId',
    target_schema: 'event',
    target_table: 'EncounterCompetitions',
    target_column: 'id',
  },
  {
    constraint_name: 'EncounterCompetitions_acceptedById_fkey',
    source_schema: 'event',
    source_table: 'EncounterCompetitions',
    source_column: 'acceptedById',
    target_schema: 'public',
    target_table: 'Players',
    target_column: 'id',
  },
  {
    constraint_name: 'EncounterCompetitions_awayTeamId_fkey',
    source_schema: 'event',
    source_table: 'EncounterCompetitions',
    source_column: 'awayTeamId',
    target_schema: 'public',
    target_table: 'Teams',
    target_column: 'id',
  },
  {
    constraint_name: 'EncounterCompetitions_drawId_fkey',
    source_schema: 'event',
    source_table: 'EncounterCompetitions',
    source_column: 'drawId',
    target_schema: 'event',
    target_table: 'DrawCompetitions',
    target_column: 'id',
  },
  {
    constraint_name: 'EncounterCompetitions_enteredById_fkey',
    source_schema: 'event',
    source_table: 'EncounterCompetitions',
    source_column: 'enteredById',
    target_schema: 'public',
    target_table: 'Players',
    target_column: 'id',
  },
  {
    constraint_name: 'EncounterCompetitions_gameLeaderId_fkey',
    source_schema: 'event',
    source_table: 'EncounterCompetitions',
    source_column: 'gameLeaderId',
    target_schema: 'public',
    target_table: 'Players',
    target_column: 'id',
  },
  {
    constraint_name: 'EncounterCompetitions_homeTeamId_fkey',
    source_schema: 'event',
    source_table: 'EncounterCompetitions',
    source_column: 'homeTeamId',
    target_schema: 'public',
    target_table: 'Teams',
    target_column: 'id',
  },
  {
    constraint_name: 'Entries_player1Id_fkey',
    source_schema: 'event',
    source_table: 'Entries',
    source_column: 'player1Id',
    target_schema: 'public',
    target_table: 'Players',
    target_column: 'id',
  },
  {
    constraint_name: 'Entries_player2Id_fkey',
    source_schema: 'event',
    source_table: 'Entries',
    source_column: 'player2Id',
    target_schema: 'public',
    target_table: 'Players',
    target_column: 'id',
  },
  {
    constraint_name: 'Entries_teamId_fkey',
    source_schema: 'event',
    source_table: 'Entries',
    source_column: 'teamId',
    target_schema: 'public',
    target_table: 'Teams',
    target_column: 'id',
  },
  {
    constraint_name: 'GamePlayerMemberships_systemId_fkey',
    source_schema: 'event',
    source_table: 'GamePlayerMemberships',
    source_column: 'systemId',
    target_schema: 'ranking',
    target_table: 'RankingSystems',
    target_column: 'id',
  },
  {
    constraint_name: 'GamePlayers_gameId_fkey',
    source_schema: 'event',
    source_table: 'GamePlayerMemberships',
    source_column: 'gameId',
    target_schema: 'event',
    target_table: 'Games',
    target_column: 'id',
  },
  {
    constraint_name: 'GamePlayers_playerId_fkey',
    source_schema: 'event',
    source_table: 'GamePlayerMemberships',
    source_column: 'playerId',
    target_schema: 'public',
    target_table: 'Players',
    target_column: 'id',
  },
  {
    constraint_name: 'Games_courtId_fkey',
    source_schema: 'event',
    source_table: 'Games',
    source_column: 'courtId',
    target_schema: 'event',
    target_table: 'Courts',
    target_column: 'id',
  },
  {
    constraint_name: 'LocationEventTournaments_eventId_fkey',
    source_schema: 'event',
    source_table: 'LocationEventTournaments',
    source_column: 'eventId',
    target_schema: 'event',
    target_table: 'EventTournaments',
    target_column: 'id',
  },
  {
    constraint_name: 'LocationEventTournaments_locationId_fkey',
    source_schema: 'event',
    source_table: 'LocationEventTournaments',
    source_column: 'locationId',
    target_schema: 'event',
    target_table: 'Locations',
    target_column: 'id',
  },
  {
    constraint_name: 'Locations_clubId_fkey',
    source_schema: 'event',
    source_table: 'Locations',
    source_column: 'clubId',
    target_schema: 'public',
    target_table: 'Clubs',
    target_column: 'id',
  },
  {
    constraint_name: 'Standings_entryId_fkey',
    source_schema: 'event',
    source_table: 'Standings',
    source_column: 'entryId',
    target_schema: 'event',
    target_table: 'Entries',
    target_column: 'id',
  },
  {
    constraint_name: 'SubEventCompetitions_eventId_fkey',
    source_schema: 'event',
    source_table: 'SubEventCompetitions',
    source_column: 'eventId',
    target_schema: 'event',
    target_table: 'EventCompetitions',
    target_column: 'id',
  },
  {
    constraint_name: 'SubEventTournaments_eventId_fkey',
    source_schema: 'event',
    source_table: 'SubEventTournaments',
    source_column: 'eventId',
    target_schema: 'event',
    target_table: 'EventTournaments',
    target_column: 'id',
  },
  {
    constraint_name: 'TeamLocationCompetitions_locationId_fkey',
    source_schema: 'event',
    source_table: 'TeamLocationCompetitions',
    source_column: 'locationId',
    target_schema: 'event',
    target_table: 'Locations',
    target_column: 'id',
  },
  {
    constraint_name: 'TeamLocationCompetitions_teamId_fkey',
    source_schema: 'event',
    source_table: 'TeamLocationCompetitions',
    source_column: 'teamId',
    target_schema: 'public',
    target_table: 'Teams',
    target_column: 'id',
  },
  {
    constraint_name: 'Notifications_sendToId_fkey',
    source_schema: 'personal',
    source_table: 'Notifications',
    source_column: 'sendToId',
    target_schema: 'public',
    target_table: 'Players',
    target_column: 'id',
  },
  {
    constraint_name: 'Settings_playerId_fkey',
    source_schema: 'personal',
    source_table: 'Settings',
    source_column: 'playerId',
    target_schema: 'public',
    target_table: 'Players',
    target_column: 'id',
  },
  {
    constraint_name: 'ClubMemberships_clubId_fkey',
    source_schema: 'public',
    source_table: 'ClubPlayerMemberships',
    source_column: 'clubId',
    target_schema: 'public',
    target_table: 'Clubs',
    target_column: 'id',
  },
  {
    constraint_name: 'ClubMemberships_playerId_fkey',
    source_schema: 'public',
    source_table: 'ClubPlayerMemberships',
    source_column: 'playerId',
    target_schema: 'public',
    target_table: 'Players',
    target_column: 'id',
  },
  {
    constraint_name: 'Comments_clubId_fkey',
    source_schema: 'public',
    source_table: 'Comments',
    source_column: 'clubId',
    target_schema: 'public',
    target_table: 'Clubs',
    target_column: 'id',
  },
  {
    constraint_name: 'Comments_playerId_fkey',
    source_schema: 'public',
    source_table: 'Comments',
    source_column: 'playerId',
    target_schema: 'public',
    target_table: 'Players',
    target_column: 'id',
  },
  {
    constraint_name: 'RequestLinks_PlayerId_fkey',
    source_schema: 'public',
    source_table: 'RequestLinks',
    source_column: 'playerId',
    target_schema: 'public',
    target_table: 'Players',
    target_column: 'id',
  },
  {
    constraint_name: 'TeamPlayerMemberships_playerId_fkey',
    source_schema: 'public',
    source_table: 'TeamPlayerMemberships',
    source_column: 'playerId',
    target_schema: 'public',
    target_table: 'Players',
    target_column: 'id',
  },
  {
    constraint_name: 'TeamPlayerMemberships_teamId_fkey',
    source_schema: 'public',
    source_table: 'TeamPlayerMemberships',
    source_column: 'teamId',
    target_schema: 'public',
    target_table: 'Teams',
    target_column: 'id',
  },
  {
    constraint_name: 'Teams_captainId_fkey',
    source_schema: 'public',
    source_table: 'Teams',
    source_column: 'captainId',
    target_schema: 'public',
    target_table: 'Players',
    target_column: 'id',
  },
  {
    constraint_name: 'Teams_clubId_fkey',
    source_schema: 'public',
    source_table: 'Teams',
    source_column: 'clubId',
    target_schema: 'public',
    target_table: 'Clubs',
    target_column: 'id',
  },
  {
    constraint_name: 'GroupSubEventCompetitions_subEventId_fkey',
    source_schema: 'ranking',
    source_table: 'RankingGroupSubEventCompetitionMemberships',
    source_column: 'subEventId',
    target_schema: 'event',
    target_table: 'SubEventCompetitions',
    target_column: 'id',
  },
  {
    constraint_name: 'GroupSubEventTournaments_subEventId_fkey',
    source_schema: 'ranking',
    source_table: 'RankingGroupSubEventTournamentMemberships',
    source_column: 'subEventId',
    target_schema: 'event',
    target_table: 'SubEventTournaments',
    target_column: 'id',
  },
  {
    constraint_name: 'GroupSystems_systemId_fkey',
    source_schema: 'ranking',
    source_table: 'RankingSystemRankingGroupMemberships',
    source_column: 'systemId',
    target_schema: 'ranking',
    target_table: 'RankingSystems',
    target_column: 'id',
  },
  {
    constraint_name: 'LastPlaces_playerId_fkey',
    source_schema: 'ranking',
    source_table: 'RankingLastPlaces',
    source_column: 'playerId',
    target_schema: 'public',
    target_table: 'Players',
    target_column: 'id',
  },
  {
    constraint_name: 'LastPlaces_systemId_fkey',
    source_schema: 'ranking',
    source_table: 'RankingLastPlaces',
    source_column: 'systemId',
    target_schema: 'ranking',
    target_table: 'RankingSystems',
    target_column: 'id',
  },
  {
    constraint_name: 'Places_PlayerId_fkey',
    source_schema: 'ranking',
    source_table: 'RankingPlaces',
    source_column: 'playerId',
    target_schema: 'public',
    target_table: 'Players',
    target_column: 'id',
  },
  {
    constraint_name: 'Places_SystemId_fkey',
    source_schema: 'ranking',
    source_table: 'RankingPlaces',
    source_column: 'systemId',
    target_schema: 'ranking',
    target_table: 'RankingSystems',
    target_column: 'id',
  },
  {
    constraint_name: 'Points_GameId_fkey',
    source_schema: 'ranking',
    source_table: 'RankingPoints',
    source_column: 'gameId',
    target_schema: 'event',
    target_table: 'Games',
    target_column: 'id',
  },
  {
    constraint_name: 'Points_PlayerId_fkey',
    source_schema: 'ranking',
    source_table: 'RankingPoints',
    source_column: 'playerId',
    target_schema: 'public',
    target_table: 'Players',
    target_column: 'id',
  },
  {
    constraint_name: 'Points_SystemId_fkey',
    source_schema: 'ranking',
    source_table: 'RankingPoints',
    source_column: 'systemId',
    target_schema: 'ranking',
    target_table: 'RankingSystems',
    target_column: 'id',
  },
  {
    constraint_name: 'PlayerClaimMemberships_claimId_fkey',
    source_schema: 'security',
    source_table: 'PlayerClaimMemberships',
    source_column: 'claimId',
    target_schema: 'security',
    target_table: 'Claims',
    target_column: 'id',
  },
  {
    constraint_name: 'PlayerClaimMemberships_userId_fkey',
    source_schema: 'security',
    source_table: 'PlayerClaimMemberships',
    source_column: 'playerId',
    target_schema: 'public',
    target_table: 'Players',
    target_column: 'id',
  },
  {
    constraint_name: 'PlayerRoleMemberships_roleId_fkey',
    source_schema: 'security',
    source_table: 'PlayerRoleMemberships',
    source_column: 'roleId',
    target_schema: 'security',
    target_table: 'Roles',
    target_column: 'id',
  },
  {
    constraint_name: 'PlayerRoleMemberships_userId_fkey',
    source_schema: 'security',
    source_table: 'PlayerRoleMemberships',
    source_column: 'playerId',
    target_schema: 'public',
    target_table: 'Players',
    target_column: 'id',
  },
  {
    constraint_name: 'RoleClaimMemberships_claimId_fkey',
    source_schema: 'security',
    source_table: 'RoleClaimMemberships',
    source_column: 'claimId',
    target_schema: 'security',
    target_table: 'Claims',
    target_column: 'id',
  },
  {
    constraint_name: 'RoleClaimMemberships_roleId_fkey',
    source_schema: 'security',
    source_table: 'RoleClaimMemberships',
    source_column: 'roleId',
    target_schema: 'security',
    target_table: 'Roles',
    target_column: 'id',
  },
  {
    constraint_name: 'Roles_clubId_fkey',
    source_schema: 'security',
    source_table: 'Roles',
    source_column: 'clubId',
    target_schema: 'public',
    target_table: 'Clubs',
    target_column: 'id',
  },
];

const otherForeignKeys = [
  {
    source_schema: 'event',
    source_table: 'Entries',
    source_column: 'subEventId',
  },
  {
    source_schema: 'event',
    source_table: 'Entries',
    source_column: 'drawId',
  },
  {
    source_schema: 'event',
    source_table: 'Games',
    source_column: 'linkId',
  },
  {
    source_schema: 'public',
    source_table: 'Comments',
    source_column: 'linkId',
  },
  {
    source_schema: 'personal',
    source_table: 'Notifications',
    source_column: 'linkId',
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      console.log('removing all foreign keys');
      for (const foreignKeyInfo of foreignKeys) {
        await queryInterface.removeConstraint(
          {
            tableName: foreignKeyInfo.source_table,
            schema: foreignKeyInfo.source_schema,
          },
          foreignKeyInfo.constraint_name,
          { transaction },
        );
      }

      console.log('Converting all id columns to uuid');

      for (const tableName of tableNames) {
        await queryInterface.sequelize.query(
          `ALTER TABLE "${tableName.schema}"."${tableName.tableName}" ALTER COLUMN "id" TYPE uuid USING "id"::uuid;`,
          { transaction },
        );
      }

      console.log('Converting all foreign keys to uuid');

      for (const foreignKeyInfo of [...foreignKeys, ...otherForeignKeys]) {
        await queryInterface.sequelize.query(
          `ALTER TABLE "${foreignKeyInfo.source_schema}"."${foreignKeyInfo.source_table}" ALTER COLUMN "${foreignKeyInfo.source_column}" TYPE uuid USING "${foreignKeyInfo.source_column}"::uuid;`,
          { transaction },
        );
      }

      console.log('Recreating foreign key');
      for (const foreignKeyInfo of foreignKeys) {
        console.log(
          `Progress ${foreignKeyInfo.constraint_name} %${Math.round(
            (foreignKeys.indexOf(foreignKeyInfo) / foreignKeys.length) * 100,
          )}`,
        );

        await queryInterface.addConstraint(
          {
            tableName: foreignKeyInfo.source_table,
            schema: foreignKeyInfo.source_schema,
          },
          {
            type: 'foreign key',
            name: foreignKeyInfo.constraint_name,
            fields: [foreignKeyInfo.source_column],
            references: {
              table: {
                tableName: foreignKeyInfo.target_table,
                schema: foreignKeyInfo.target_schema,
              },
              field: foreignKeyInfo.target_column,
            },
            onDelete: 'cascade',
            onUpdate: 'cascade',
            transaction,
          },
        );
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // remove all foreign keys
      for (const foreignKeyInfo of foreignKeys) {
        await queryInterface.removeConstraint(
          {
            tableName: foreignKeyInfo.source_table,
            schema: foreignKeyInfo.source_schema,
          },
          foreignKeyInfo.constraint_name,
          { transaction },
        );
      }

      // convert all id columns to string
      for (const tableName of tableNames) {
        await queryInterface.sequelize.query(
          `ALTER TABLE "${tableName.schema}"."${tableName.tableName}" ALTER COLUMN "id" TYPE varchar(255) USING "id"::varchar(255);`,
          { transaction },
        );
      }

      // convert all foreign keys to string
      for (const foreignKeyInfo of [...foreignKeys, ...otherForeignKeys]) {
        await queryInterface.sequelize.query(
          `ALTER TABLE "${foreignKeyInfo.source_schema}"."${foreignKeyInfo.source_table}" ALTER COLUMN "${foreignKeyInfo.source_column}" TYPE varchar(255) USING "${foreignKeyInfo.source_column}"::varchar(255);`,
          { transaction },
        );
      }

      // recreate foreign key
      for (const foreignKeyInfo of foreignKeys) {
        await queryInterface.addConstraint(
          {
            tableName: foreignKeyInfo.source_table,
            schema: foreignKeyInfo.source_schema,
          },
          {
            type: 'foreign key',
            name: foreignKeyInfo.constraint_name,
            fields: [foreignKeyInfo.source_column],
            references: {
              table: {
                tableName: foreignKeyInfo.target_table,
                schema: foreignKeyInfo.target_schema,
              },
              field: foreignKeyInfo.target_column,
            },
            onDelete: 'cascade',
            onUpdate: 'cascade',
            transaction,
          },
        );
      }
    });
  },
};
