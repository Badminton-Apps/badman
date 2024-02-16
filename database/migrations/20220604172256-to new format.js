/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

module.exports = {
  up: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.renameTable(
          {
            tableName: 'GroupSubEventTournaments',
            schema: 'ranking',
          },
          'RankingGroupSubEventTournamentMemberships',
          { transaction: t },
        );

        await queryInterface.renameTable(
          {
            tableName: 'GroupSubEventCompetitions',
            schema: 'ranking',
          },
          'RankingGroupSubEventCompetitionMemberships',
          { transaction: t },
        );
        await queryInterface.renameTable(
          {
            tableName: 'GroupSystems',
            schema: 'ranking',
          },
          'RankingSystemRankingGroupMemberships',
          { transaction: t },
        );
        await queryInterface.renameTable(
          {
            tableName: 'Groups',
            schema: 'ranking',
          },
          'RankingGroups',
          { transaction: t },
        );

        await queryInterface.renameTable(
          {
            tableName: 'LastPlaces',
            schema: 'ranking',
          },
          'RankingLastPlaces',
          { transaction: t },
        );

        await queryInterface.renameTable(
          {
            tableName: 'Places',
            schema: 'ranking',
          },
          'RankingPlaces',
          { transaction: t },
        );

        await queryInterface.renameTable(
          {
            tableName: 'Points',
            schema: 'ranking',
          },
          'RankingPoints',
          { transaction: t },
        );

        await queryInterface.renameTable(
          {
            tableName: 'Systems',
            schema: 'ranking',
          },
          'RankingSystems',
          { transaction: t },
        );

        await queryInterface.renameTable(
          {
            tableName: 'ClubMemberships',
            schema: 'public',
          },
          'ClubPlayerMemberships',
          { transaction: t },
        );

        await queryInterface.renameColumn(
          {
            tableName: 'RankingPoints',
            schema: 'ranking',
          },
          'SystemId',
          'systemId',
          { transaction: t },
        );
        await queryInterface.renameColumn(
          {
            tableName: 'RankingPoints',
            schema: 'ranking',
          },
          'GameId',
          'gameId',
          { transaction: t },
        );
        await queryInterface.renameColumn(
          {
            tableName: 'RankingPlaces',
            schema: 'ranking',
          },
          'SystemId',
          'systemId',
          { transaction: t },
        );
      } catch (err) {
        console.error('We errored with', err?.message ?? err);
        t.rollback();
        throw err;
      }
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.renameColumn(
          {
            tableName: 'RankingPoints',
            schema: 'ranking',
          },
          'systemId',
          'SystemId',
          { transaction: t },
        );
        await queryInterface.renameColumn(
          {
            tableName: 'RankingPoints',
            schema: 'ranking',
          },
          'gameId',
          'GameId',
          { transaction: t },
        );
        await queryInterface.renameColumn(
          {
            tableName: 'RankingPlaces',
            schema: 'ranking',
          },
          'systemId',
          'SystemId',
          { transaction: t },
        );
        await queryInterface.renameTable(
          {
            tableName: 'RankingSystemRankingGroupMemberships',
            schema: 'ranking',
          },
          'GroupSystems',
          { transaction: t },
        );
        await queryInterface.renameTable(
          {
            tableName: 'RankingGroups',
            schema: 'ranking',
          },
          'Groups',
          { transaction: t },
        );

        await queryInterface.renameTable(
          {
            tableName: 'RankingLastPlaces',
            schema: 'ranking',
          },
          'LastPlaces',
          { transaction: t },
        );

        await queryInterface.renameTable(
          {
            tableName: 'RankingPlaces',
            schema: 'ranking',
          },
          'Places',
          { transaction: t },
        );

        await queryInterface.renameTable(
          {
            tableName: 'RankingPoints',
            schema: 'ranking',
          },
          'Points',
          { transaction: t },
        );

        await queryInterface.renameTable(
          {
            tableName: 'RankingSystems',
            schema: 'ranking',
          },
          'Systems',
          { transaction: t },
        );
        await queryInterface.renameTable(
          {
            tableName: 'RankingGroupSubEventTournamentMemberships',
            schema: 'ranking',
          },
          'GroupSubEventTournaments',
          { transaction: t },
        );

        await queryInterface.renameTable(
          {
            tableName: 'RankingGroupSubEventCompetitionMemberships',
            schema: 'ranking',
          },
          'GroupSubEventCompetitions',
          { transaction: t },
        );

        await queryInterface.renameTable(
          {
            tableName: 'ClubPlayerMemberships',
            schema: 'public',
          },
          'ClubMemberships',
          { transaction: t },
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
