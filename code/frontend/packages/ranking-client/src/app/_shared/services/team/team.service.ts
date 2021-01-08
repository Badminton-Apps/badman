import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SortDirection } from '@angular/material/sort';
import { Apollo } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from './../../../../environments/environment';
import { RankingSystem, RankingSystemGroup } from './../../models';

const teamsWithCountsQuery = require('graphql-tag/loader!../../graphql/rankingSystem/queries/GetSystemQueryWithCounts.graphql');
const teamQuery = require('graphql-tag/loader!../../graphql/rankingSystem/queries/GetSystemQuery.graphql');
const teamsQuery = require('graphql-tag/loader!../../graphql/teams/queries/GetTeamsQuery.graphql');

const addTeamMutation = require('graphql-tag/loader!../../graphql/rankingSystem/mutations/addRankingSystem.graphql');
const updateTeamMutatino = require('graphql-tag/loader!../../graphql/rankingSystem/mutations/updateRankingSystem.graphql');

@Injectable({
  providedIn: 'root',
})
export class TeamService {
  constructor( private apollo: Apollo) {}


  getTeam(systemId: number) {
    throw new Error("not Implemented")
    return this.apollo
      .query<{ system: RankingSystem }>({
        query: teamQuery,
        variables: {
          id: systemId,
        },
      })
      .pipe(map((x) => new RankingSystem(x.data.system)));
  }


  getTeamWithCount(systemId: number, gender?: string) {
    throw new Error("not Implemented")
    return this.apollo
      .query({
        query: teamsWithCountsQuery,
        variables: {
          id: systemId,
          gender,
        },
      })
      .pipe(map((x: any) => x.data?.system as RankingSystem));
  }

  addTeam(rankingSystem: RankingSystem) {
    throw new Error("not Implemented")
    return this.apollo
      .mutate<{ updateRankingSystem: RankingSystem }>({
        mutation: addTeamMutation,
        variables: {
          rankingSystem,
        },
      })
      .pipe(map((x) => new RankingSystem(x.data.updateRankingSystem)));
  }

  updateTeam(rankingSystem: RankingSystem) {
    throw new Error("not Implemented")
    return this.apollo
      .mutate<{ updateRankingSystem: RankingSystem }>({
        mutation: updateTeamMutatino,
        variables: {
          rankingSystem,
        },
      })
      .pipe(map((x) => new RankingSystem(x.data.updateRankingSystem)));
  }


  getTeams(
    clubId: number,
    sort?: string,
    direction?: SortDirection,
    page?: number
  ): Observable<RankingSystem[]> {
    return this.apollo
      .query({
        query:  teamsQuery,
        fetchPolicy: 'no-cache',
        variables: {
          clubId,
        },
      })
      .pipe(map((x: any) => x.data?.teams as RankingSystem[]));
  }

}
