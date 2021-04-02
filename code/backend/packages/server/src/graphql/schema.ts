import {
  updateCompetitionEventLocationMutation,
  updateTournamentEventLocationMutation
} from './mutations/locations.mutations';
import { updatePlayerRankingMutation } from './mutations/player.mutations';
import { GraphQLObjectType, GraphQLSchema } from 'graphql';
import {
  addClubMutation,
  addEventCompetitionMutation,
  addEventTournamentMutation,
  addLocationMutation,
  addPlayerToClubMutation,
  addPlayerToRoleMutation,
  addPlayerToTeamMutation,
  addRankingSystemGroupMutation,
  addRankingSystemMutation,
  addRoleMutation,
  addTeamMutation,
  deleteImportedEventMutation,
  removeLocationMutation,
  removePlayerFromRoleMutation,
  removePlayerFromTeamMutation,
  removeTeamMutation,
  setGroupsCompetitionMutation,
  updateClubMutation,
  updateEventCompetitionMutation,
  updateEventTournamentMutation,
  updateLocationMutation,
  updatePlayerTeamMutation,
  updateSubEventTeamMutation,
  updateRankingSystemGroupMutation,
  updateRankingSystemMutation,
  updateRoleMutation,
  updateTeamMutation,
  updateGlobalClaimUserMutation,
  addPlayerMutation,
  updatePlayerMutation
} from './mutations';
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
  locationQuery,
  playerQuery,
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
        players: playersQuery,
        eventCompetition: eventCompetitionQuery,
        eventCompetitions: eventCompetitionsQuery,
        eventTournament: eventTournamentQuery,
        eventTournaments: eventTournamentsQuery,
        location: locationQuery,
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
        addPlayer: addPlayerMutation,
        updatePlayer: updatePlayerMutation,
        updatePlayerRanking: updatePlayerRankingMutation,
        addTeam: addTeamMutation,
        updateTeam: updateTeamMutation,
        removeTeam: removeTeamMutation,
        updatePlayerTeam: updatePlayerTeamMutation,
        updateSubEventTeam: updateSubEventTeamMutation,
        addPlayerToTeam: addPlayerToTeamMutation,
        removePlayerFromTeam: removePlayerFromTeamMutation,
        addLocation: addLocationMutation,
        updateLocation: updateLocationMutation,
        removeLocation: removeLocationMutation,
        updateCompetitionEventLocation: updateCompetitionEventLocationMutation,
        updateTournamentEventLocation: updateTournamentEventLocationMutation,
        addRole: addRoleMutation,
        updateRole: updateRoleMutation,
        addPlayerToRole: addPlayerToRoleMutation,
        removePlayerFromRole: removePlayerFromRoleMutation,
        updateGlobalClaimUser: updateGlobalClaimUserMutation,
        addEventCompetition: addEventCompetitionMutation,
        addEventTournament: addEventTournamentMutation,
        updateEventCompetition: updateEventCompetitionMutation,
        updateEventTournament: updateEventTournamentMutation,
        setGroupsCompetition: setGroupsCompetitionMutation,
        addRankingSystem: addRankingSystemMutation,
        updateRankingSystem: updateRankingSystemMutation,
        addRankingSystemGroup: addRankingSystemGroupMutation,
        updateRankingSystemGroup: updateRankingSystemGroupMutation,
        deleteImportedEvent: deleteImportedEventMutation
      })
    })
  });
};
