import { Injectable } from '@angular/core';
import { SortDirection } from '@angular/material/sort';
import { Apollo } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Player, Team } from './../../models';

import * as teamQuery from '../../graphql/teams/queries/GetTeamQuery.graphql';
import * as teamsQuery from '../../graphql/teams/queries/GetTeamsQuery.graphql';

import * as addTeamMutation from '../../graphql/teams/mutations/addTeam.graphql';
import * as updateTeamMutation from '../../graphql/teams/mutations/updateTeam.graphql';
import * as addPlayerToTeamMutation from '../../graphql/teams/mutations/addPlayerToTeamMutation.graphql';
import * as deleteTeamMutation from '../../graphql/teams/mutations/removeTeam.graphql';
import * as removePlayerToTeamMutation from '../../graphql/teams/mutations/removePlayerToTeamMutation.graphql';
import * as updatePlayerTeamMutation from '../../graphql/teams/mutations/updatePlayerTeamMutation.graphql';

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

  addTeam(team: Partial<Team>, clubId: string) {
    return this.apollo
      .mutate<{ addTeam: Team }>({
        mutation: addTeamMutation,
        variables: {
          team: { ...team },
          clubId,
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
  updatePlayer(team: Team, player: Player) {
    return this.apollo.mutate({
      mutation: updatePlayerTeamMutation,
      variables: {
        playerId: player.id,
        teamId: team.id,
        base: player.base,
      },
    });
  }

  updateTeam(team: Partial<Team>) {
    return this.apollo
      .mutate<{ updateTeam: Team }>({
        mutation: updateTeamMutation,
        variables: {
          team,
        },
      })
      .pipe(map((x) => new Team(x.data.updateTeam)));
  }

  deleteTeam(teamId: string) {
    return this.apollo.mutate<{ removeTeam: Team }>({
      mutation: deleteTeamMutation,
      variables: {
        teamId,
      },
    });
  }

  getTeams(clubId: string, sort?: string, direction?: SortDirection, page?: number): Observable<Team[]> {
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
