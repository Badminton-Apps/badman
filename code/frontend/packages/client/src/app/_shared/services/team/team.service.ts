import { Apollo } from 'apollo-angular';
import { Injectable } from '@angular/core';
import { SortDirection } from '@angular/material/sort';

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
import * as addBasePlayerForSubEvent from '../../graphql/teams/mutations/addBasePlayerForSubEvent.graphql';
import * as removeBasePlayerForSubEvent from '../../graphql/teams/mutations/removeBasePlayerForSubEvent.graphql';

@Injectable({
  providedIn: 'root',
})
export class TeamService {
  constructor(private apollo: Apollo) {}


  addTeam(team: Partial<Team>, clubId: string) {
    return this.apollo
      .mutate<{ addTeam: Team }>({
        mutation: addTeamMutation,
        variables: {
          team: { ...team },
          clubId,
        },
      })
      .pipe(map((x) => new Team(x.data!.addTeam)));
  }

  addPlayer(team: Team, player: Player, personal = false) {
    return this.apollo.mutate({
      mutation: addPlayerToTeamMutation,
      awaitRefetchQueries: true,
      refetchQueries: [
        {
          query: teamQuery,
          variables: {
            id: team.id,
            personal
          },
        },
      ],
      variables: {
        playerId: player.id,
        teamId: team.id,
      },
    });
  }

  removePlayer(team: Team, player: Player, personal = false) {
    return this.apollo.mutate({
      mutation: removePlayerToTeamMutation,
      awaitRefetchQueries: true,
      refetchQueries: [
        {
          query: teamQuery,
          variables: {
            id: team.id,
            personal
          },
        },
      ],
      variables: {
        playerId: player.id,
        teamId: team.id,
      },
    });
  }
  updatePlayer(team: Team, player: Player, personal = false) {
    return this.apollo.mutate({
      mutation: updatePlayerTeamMutation,
      refetchQueries: [
        {
          query: teamQuery,
          variables: {
            id: team.id,
            personal
          },
        },
      ],
      variables: {
        playerId: player.id,
        teamId: team.id,
        base: player.base,
      },
    });
  }

  updateTeam(team: Partial<Team>, personal = false) {
    return this.apollo
      .mutate<{ updateTeam: Team }>({
        mutation: updateTeamMutation,
        awaitRefetchQueries: true,
        refetchQueries: [
          {
            query: teamQuery,
            variables: {
              id: team.id,
              personal
            },
          },
        ],
        variables: {
          team,
        },
      })
      .pipe(map((x) => new Team(x.data!['updateTeam'])));
  }

  deleteTeam(teamId: string) {
    return this.apollo.mutate<{ removeTeam: Team }>({
      mutation: deleteTeamMutation,
      variables: {
        teamId,
      },
    });
  }

  getTeams(clubId: string, active: boolean = true): Observable<Team[]> {
    return this.apollo
      .query({
        query: teamsQuery,
        variables: {
          where: { active, clubId },
        },
      })
      .pipe(map((x: any) => x.data?.teams?.map((t: Partial<Team>) => new Team(t))));
  }


  addBasePlayer(teamId: string, playerId: string, subEventId: string) {
    return this.apollo.mutate<{ addPlayerBaseSubEventMutation: Team }>({
      mutation: addBasePlayerForSubEvent,
      variables: {
        teamId,
        playerId,
        subEventId,
      },
    });
  }

  removeBasePlayer(teamId: string, playerId: string, subEventId: string) {
    return this.apollo.mutate<{ removePlayerBaseSubEventMutation: Team }>({
      mutation: removeBasePlayerForSubEvent,
      variables: {
        teamId,
        playerId,
        subEventId,
      },
    });
  }
}
