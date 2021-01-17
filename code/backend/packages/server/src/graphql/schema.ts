import { GraphQLObjectType, GraphQLSchema } from 'graphql';
import {
  addEventMutation,
  addRankingSystemMutation,
  deleteImportedEventMutation,
  updateEventMutation,
  updateRankingSystemMutation,
  addRankingSystemGroupMutation,
  updateRankingSystemGroupMutation,
  addClubMutation,
  updateClubMutation,
  addPlayerToClubMutation,
  addPlayerToTeamMutation,
  addTeamMutation,
  removePlayerToTeamMutation,
  updateTeamMutation
} from './mutations';
import {
  clubsQuery,
  teamQuery,
  teamsQuery,
  eventQuery,
  eventsQuery,
  gamesQuery,
  importedQuery,
  playerQuery,
  playerSearchQuery,
  playersQuery,
  systemQuery,
  systemsGroupsQuery,
  systemsQuery,
  clubQuery
} from './queries';

export const createSchema = () => {
  return new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'RootQueryType',
      fields: () => ({
        player: playerQuery,
        playerSearch: playerSearchQuery,
        players: playersQuery,
        event: eventQuery,
        events: eventsQuery,
        imported: importedQuery,
        games: gamesQuery,
        team: teamQuery,
        teams: teamsQuery,
        club: clubQuery,
        clubs: clubsQuery,
        system: systemQuery,
        systems: systemsQuery,
        rankingSystemGroup: systemsGroupsQuery
      })
    }),
    mutation: new GraphQLObjectType({
      name: 'RootMutationType',
      fields: () => ({
        addClub: addClubMutation,
        updateClub: updateClubMutation,
        addPlayerToClub: addPlayerToClubMutation,
        addTeam: addTeamMutation,
        updateTeam: updateTeamMutation,
        addPlayerToTeam: addPlayerToTeamMutation,
        removePlayerToTeam: removePlayerToTeamMutation,
        addEvent: addEventMutation,
        updateEvent: updateEventMutation,
        addRankingSystem: addRankingSystemMutation,
        updateRankingSystem: updateRankingSystemMutation,
        addRankingSystemGroup: addRankingSystemGroupMutation,
        updateRankingSystemGroup: updateRankingSystemGroupMutation,
        deleteImportedEvent: deleteImportedEventMutation
      })
    })
  });
};
