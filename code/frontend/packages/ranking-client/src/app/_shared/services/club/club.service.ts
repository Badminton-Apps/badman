import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { map } from 'rxjs/operators';
import { Club, Player, RankingSystem } from './../../models';

const clubQuery = require('graphql-tag/loader!../../graphql/clubs/queries/GetClubQuery.graphql');
const clubsQuery = require('graphql-tag/loader!../../graphql/clubs/queries/GetClubsQuery.graphql');

const addClubMutation = require('graphql-tag/loader!../../graphql/clubs/mutations/addClub.graphql');
const updateClubMutation = require('graphql-tag/loader!../../graphql/clubs/mutations/updateClub.graphql');
const addPlayerToClubMutation = require('graphql-tag/loader!../../graphql/clubs/mutations/addPlayerToClubMutation.graphql');

@Injectable({
  providedIn: 'root',
})
export class ClubService {
  constructor(private apollo: Apollo) {}

  getClub(
    clubId: string,
    args?: {
      rankingSystem?: string;
      playersfrom?: Date;
      includeTeams?: boolean;
      includePlayers?: boolean;
      includeRoles?: boolean;
    }
  ) {
    args = {
      includeTeams: false,
      includePlayers: false,
      includeRoles: false,
      ...args,
    };

    return this.apollo
      .query<{ club: Club }>({
        query: clubQuery,
        variables: {
          id: clubId,
          end: args.playersfrom?.toISOString(),
          rankingType: args.rankingSystem,
          includePlaces: args.rankingSystem !== null,
          includeTeams: args.includeTeams,
          includePlayers: args.includePlayers,
          includeRoles: args.includeRoles,
        },
      })
      .pipe(map((x) => new Club(x.data.club)));
  }

  addClub(club: Club) {
    return this.apollo
      .mutate<{ addClub: Club }>({
        mutation: addClubMutation,
        variables: {
          club,
        },
      })
      .pipe(map((x) => new Club(x.data.addClub)));
  }

  addPlayer(club: Club, player: Player) {
    return this.apollo.mutate({
      mutation: addPlayerToClubMutation,
      variables: {
        playerId: player.id,
        clubId: club.id,
      },
    });
  }

  updateClub(club: Club) {
    return this.apollo
      .mutate<{ updateClub: Club }>({
        mutation: updateClubMutation,
        variables: {
          club,
        },
      })
      .pipe(map((x) => new Club(x.data.updateClub)));
  }

  getClubs(args?: {
    first?: number;
    after?: string;
    query?: string;
    ids?: string[];
  }) {
    let where = undefined;
    if (args.query) {
      where = {
        name: {
          $iLike: `%${args.query}%`,
        },
      };
    }

    if (args.ids) {
      where = {
        id: {
          in: args.ids,
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
          first: args.first,
          after: args.after,
          where,
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
