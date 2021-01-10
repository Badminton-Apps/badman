import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SortDirection } from '@angular/material/sort';
import { Apollo } from 'apollo-angular';
import { Club } from 'app/_shared/models/club.model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from './../../../../environments/environment';
import { RankingSystem, RankingSystemGroup } from './../../models';

const clubsWithCountsQuery = require('graphql-tag/loader!../../graphql/rankingSystem/queries/GetSystemQueryWithCounts.graphql');
const clubQuery = require('graphql-tag/loader!../../graphql/rankingSystem/queries/GetSystemQuery.graphql');
const clubsQuery = require('graphql-tag/loader!../../graphql/clubs/queries/GetClubsQuery.graphql');

const addClubMutation = require('graphql-tag/loader!../../graphql/rankingSystem/mutations/addRankingSystem.graphql');
const updateClubMutatino = require('graphql-tag/loader!../../graphql/rankingSystem/mutations/updateRankingSystem.graphql');

@Injectable({
  providedIn: 'root',
})
export class ClubService {
  constructor(private apollo: Apollo) {}

  getClub(systemId: number) {
    throw new Error('not Implemented');
    return this.apollo
      .query<{ system: Club }>({
        query: clubQuery,
        variables: {
          id: systemId,
        },
      })
      .pipe(map((x) => new Club(x.data.system)));
  }

  getClubWithCount(systemId: number, gender?: string) {
    throw new Error('not Implemented');
    return this.apollo
      .query({
        query: clubsWithCountsQuery,
        variables: {
          id: systemId,
          gender,
        },
      })
      .pipe(map((x: any) => x.data?.system as Club));
  }

  addClub(rankingSystem: Club) {
    throw new Error('not Implemented');
    return this.apollo
      .mutate<{ updateClub: Club }>({
        mutation: addClubMutation,
        variables: {
          rankingSystem,
        },
      })
      .pipe(map((x) => new Club(x.data.updateClub)));
  }

  updateClub(rankingSystem: Club) {
    throw new Error('not Implemented');
    return this.apollo
      .mutate<{ updateClub: Club }>({
        mutation: updateClubMutatino,
        variables: {
          rankingSystem,
        },
      })
      .pipe(map((x) => new Club(x.data.updateClub)));
  }

  getClubs(first: number, after: string, query: any) {
    let where = undefined;
    if (query) {
      where = {
        name: {
          $iLike: `%${query}%`,
        },
      };
    }

    return this.apollo
      .query<{
        clubs: {
          total: number;
          edges: { cursor: string; node: Club }[];
        };
      }>({
        query: clubsQuery,
        variables: {
          first,
          after,
          where
        },
      })
      .pipe(
        map((x) => {
          if (x.data.clubs) {
            x.data.clubs.edges = x.data.clubs.edges.map((x) => {
              x.node = new Club(x.node);
              return x;
            });
          }
          return x.data;
        })
      );
  }
}
