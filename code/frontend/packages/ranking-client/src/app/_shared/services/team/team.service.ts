import { Injectable } from '@angular/core';
import { SortDirection } from '@angular/material/sort';
import { Apollo } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Player, Team } from './../../models';

const teamQuery = require('graphql-tag/loader!../../graphql/teams/queries/GetTeamQuery.graphql');
const teamsQuery = require('graphql-tag/loader!../../graphql/teams/queries/GetTeamsQuery.graphql');

const addTeamMutation = require('graphql-tag/loader!../../graphql/teams/mutations/addTeam.graphql');
const updateTeamMutation = require('graphql-tag/loader!../../graphql/teams/mutations/updateTeam.graphql');
const addPlayerToTeamMutation = require('graphql-tag/loader!../../graphql/teams/mutations/addPlayerToTeamMutation.graphql');
const removePlayerToTeamMutation = require('graphql-tag/loader!../../graphql/teams/mutations/removePlayerToTeamMutation.graphql');

@Injectable({
  providedIn: 'root',
})
export class TeamService {
  constructor(private apollo: Apollo) {}

  getTeam(teamId: string) {
    return this.apollo
      .query<{ team: Team }>({
        query: teamQuery,
        variables: {
          id: teamId,
        },
      })
      .pipe(map((x) => new Team(x.data.team)));
  }

  addTeam(team: Team, clubId: string) {
    return this.apollo
      .mutate<{ addTeam: Team }>({
        mutation: addTeamMutation,
        variables: {
          team: { ...team, id: -1, ClubId: clubId },
        },
      })
      .pipe(map((x) => new Team(x.data.addTeam)));
  }

  addPlayer(team: Team, player: Player) {
    return this.apollo.mutate({
      mutation: addPlayerToTeamMutation,
      variables: {
        playerId: player.id,
        teamId: team.id,
      },
    });
  }

  removePlayer(team: Team, player: Player) {
    return this.apollo.mutate({
      mutation: removePlayerToTeamMutation,
      variables: {
        playerId: player.id,
        teamId: team.id,
      },
    });
  }


  updateTeam(team: Team) {
    return this.apollo
      .mutate<{ updateTeam: Team }>({
        mutation: updateTeamMutation,
        variables: {
          team,
        },
      })
      .pipe(map((x) => new Team(x.data.updateTeam)));
  }

  getTeams(
    clubId: string,
    sort?: string,
    direction?: SortDirection,
    page?: number
  ): Observable<Team[]> {
    return this.apollo
      .query({
        query: teamsQuery,
        fetchPolicy: 'no-cache',
        variables: {
          clubId,
        },
      })
      .pipe(map((x: any) => x.data?.teams as Team[]));
  }
}
