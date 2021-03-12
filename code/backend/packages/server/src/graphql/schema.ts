import { GraphQLObjectType, GraphQLSchema } from 'graphql';
import {
  addClubMutation,
  addEventCompetitionMutation,
  addEventTournamentMutation,
  addPlayerToClubMutation,
  addPlayerToTeamMutation,
  addRankingSystemGroupMutation,
  addRankingSystemMutation,
  addTeamMutation,
  deleteImportedEventMutation,
  removePlayerToTeamMutation,
  updateClubMutation,
  updateEventCompetitionMutation,
  updateEventTournamentMutation,
  updatePlayerTeamMutation,
  updateRankingSystemGroupMutation,
  updateRankingSystemMutation,
  updateTeamMutation
} from './mutations';
import {
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
        removePlayerToTeam: removePlayerToTeamMutation,
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
