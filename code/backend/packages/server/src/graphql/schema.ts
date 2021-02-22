import { GraphQLObjectType, GraphQLSchema } from 'graphql';
import {
  addEventCompetitionMutation,
  addEventTournamentMutation,
  addRankingSystemMutation,
  deleteImportedEventMutation,
  updateEventCompetitionMutation,
  updateEventTournamentMutation,
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
  eventCompetitionQuery,
  eventCompetitionsQuery,
  gamesQuery,
  importedQuery,
  playerQuery,
  playerSearchQuery,
  playersQuery,
  systemQuery,
  systemsGroupsQuery,
  systemsQuery,
  clubQuery,
  eventTournamentQuery,
  eventTournamentsQuery
} from './queries';

export const createSchema = () => {
  return new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'RootQueryType',
      fields: () => ({
        player: playerQuery,
        playerSearch: playerSearchQuery,
        players: playersQuery,
        // eventCompetition: eventCompetitionQuery,
        // eventCompetitions: eventCompetitionsQuery,
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
        addPlayerToTeam: addPlayerToTeamMutation,
        removePlayerToTeam: removePlayerToTeamMutation,
        // addEventCompetition: addEventCompetitionMutation,
        addEventTournament: addEventTournamentMutation,
        // updateEventCompetition: updateEventCompetitionMutation,
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
