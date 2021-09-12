import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { map } from 'rxjs/operators';
import { Club, Player, RankingSystem } from './../../models';

import * as clubQuery from '../../graphql/clubs/queries/GetClubQuery.graphql';
import * as clubGetBasePlayersQuery from '../../graphql/clubs/queries/GetBasePlayersQuery.graphql';
import * as clubGetCompYearsQuery from '../../graphql/clubs/queries/GetCompYearsQuery.graphql';
import * as clubsQuery from '../../graphql/clubs/queries/GetClubsQuery.graphql';

import * as addClubMutation from '../../graphql/clubs/mutations/addClub.graphql';
import * as removeClubMutation from '../../graphql/clubs/mutations/removeClub.graphql';
import * as updateClubMutation from '../../graphql/clubs/mutations/updateClub.graphql';
import * as addPlayerToClubMutation from '../../graphql/clubs/mutations/addPlayerToClubMutation.graphql';

@Injectable({
  providedIn: 'root',
})
export class ClubService {
  constructor(private apollo: Apollo) {}

  getClub(
    clubId: string,
    args?: {
      playersfrom?: Date;
      includePlaces?: boolean;
      includeTeams?: boolean;
      includePlacesTeams?: boolean;
      includePlayers?: boolean;
      includeRoles?: boolean;
      includeLocations?: boolean;
      teamsWhere?: { [key: string]: any };
      teamPlayersWhere?: { [key: string]: any };
    }
  ) {
    // setting default values
    args = {
      includePlaces: false,
      includeTeams: false,
      includePlacesTeams: false,
      includePlayers: false,
      includeRoles: false,
      includeLocations: false,
      ...args,
    };

    return this.apollo
      .query<{ club: Club }>({
        query: clubQuery,
        variables: {
          id: clubId,
          end: args.playersfrom?.toISOString(),
          includePlaces: args.includePlaces,
          includeTeams: args.includeTeams,
          includePlacesTeams: args.includePlacesTeams,
          includePlayers: args.includePlayers,
          includeRoles: args.includeRoles,
          includeLocations: args.includeLocations,
          teamsWhere: args.teamsWhere,
          teamPlayersWhere: args.teamPlayersWhere,
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

  removeClub(club: Club) {
    return this.apollo.mutate<{ addClub: Club }>({
      mutation: removeClubMutation,
      variables: {
        id: club.id,
      },
    });
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

  getClubs(args?: { first?: number; after?: string; query?: string; ids?: string[] }) {
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

  getTeamsForSubEvents(clubId: string, subEvents?: string[]) {
    var where = {};

    if (subEvents) {
      where = {
        id: { ['$in']: subEvents },
      };
    }

    return this.apollo
      .query<{ club: Club }>({
        query: clubGetBasePlayersQuery,
        variables: {
          id: clubId,
          subEventsWhere: where,
        },
      })
      .pipe(
        map((x) => {
          return x.data.club.teams.filter((r) => r.subEvents.length > 0 && r.subEvents[0].meta != null);
        })
      );
  }

  getCompetitionYears(clubId: string) {
    return this.apollo
      .query<{ club: Club }>({
        query: clubGetCompYearsQuery,
        variables: {
          id: clubId,
        },
      })
      .pipe(
        map((x) =>
          x.data.club.teams
            .map((r) => r.subEvents.map((r) => r.event.startYear))
            .flat()
            .filter((x, i, a) => a.indexOf(x) === i)
            .sort()
        )
      );
  }
}
