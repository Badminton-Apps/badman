import { GraphQLObjectType, GraphQLSchema } from 'graphql';
import {
  addClubMutation,
  addEventCompetitionMutation,
  addEventTournamentMutation,
  addPlayerToClubMutation,
  addPlayerToRoleMutation,
  addPlayerToTeamMutation,
  addRankingSystemGroupMutation,
  addRankingSystemMutation,
  addRoleMutation,
  addTeamMutation,
  deleteImportedEventMutation,
  removePlayerFromRoleMutation,
  removePlayerFromTeamMutation,
  updateClubMutation,
  updateEventCompetitionMutation,
  updateEventTournamentMutation,
  updatePlayerTeamMutation,
  updateRankingSystemGroupMutation,
  updateRankingSystemMutation,
  updateRoleMutation,
  updateTeamMutation
} from './mutations';
import { updateGlobalClaimUserMutation } from './mutations/claims.mutations';
import {
  claimsQuery,
  clubQuery,
  clubsQuery,
  eventCompetitionQuery,
  eventCompetitionsQuery,
  eventTournamentQuery,
  eventTournamentsQuery,
  gamesQuery,
  importedQuery,
  playerQuery,
  playerSearchQuery,
  playersQuery,
  roleQuery,
  rolesQuery,
  systemQuery,
  systemsGroupsQuery,
  systemsQuery,
  teamQuery,
  teamsQuery
} from './queries';

export const createSchema = () => {
  return new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'RootQueryType',
      fields: () => ({
        player: playerQuery,
        playerSearch: playerSearchQuery,
        players: playersQuery,
        eventCompetition: eventCompetitionQuery,
        eventCompetitions: eventCompetitionsQuery,
        eventTournament: eventTournamentQuery,
        eventTournaments: eventTournamentsQuery,
        claims: claimsQuery,
        role: roleQuery,
        roles: rolesQuery,
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
        updatePlayerTeam: updatePlayerTeamMutation,
        addPlayerToTeam: addPlayerToTeamMutation,
        removePlayerFromTeam: removePlayerFromTeamMutation,
        addRole: addRoleMutation,
        updateRole: updateRoleMutation,
        addPlayerToRole: addPlayerToRoleMutation,
        removePlayerFromRole: removePlayerFromRoleMutation,
        updateGlobalClaimUser: updateGlobalClaimUserMutation,
        addEventCompetition: addEventCompetitionMutation,
        addEventTournament: addEventTournamentMutation,
        updateEventCompetition: updateEventCompetitionMutation,
        updateEventTournament: updateEventTournamentMutation,
        addRankingSystem: addRankingSystemMutation,
        updateRankingSystem: updateRankingSystemMutation,
        addRankingSystemGroup: addRankingSystemGroupMutation,
        updateRankingSystemGroup: updateRankingSystemGroupMutation,
        deleteImportedEvent: deleteImportedEventMutation
      })
    })
  });
};
