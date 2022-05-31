import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { map } from 'rxjs/operators';
import * as addClubMutation from '../../graphql/clubs/mutations/addClub.graphql';
import * as addPlayerToClubMutation from '../../graphql/clubs/mutations/addPlayerToClubMutation.graphql';
import * as removeClubMutation from '../../graphql/clubs/mutations/removeClub.graphql';
import * as updateClubMutation from '../../graphql/clubs/mutations/updateClub.graphql';
import * as clubGetBasePlayersQuery from '../../graphql/clubs/queries/GetBasePlayersQuery.graphql';
import * as clubQuery from '../../graphql/clubs/queries/GetClubQuery.graphql';
import * as clubsQuery from '../../graphql/clubs/queries/GetClubsQuery.graphql';
import * as clubGetCompYearsQuery from '../../graphql/clubs/queries/GetCompYearsQuery.graphql';
import { pageArgs } from '../../utils';
import { Club, Player } from './../../models';

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
      teamsWhere?: { [key: string]: unknown };
      teamPlayersWhere?: { [key: string]: unknown };
      systemId?: string;
      fromCache: boolean;
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
      fromCache: true,
      ...args,
    };

    return this.apollo
      .query<{ club: Club }>({
        query: clubQuery,
        fetchPolicy: args.fromCache ? 'cache-first' : 'network-only',
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
          systemId: args.systemId,
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
      .pipe(
        map((x) => {
          if (!x.data?.addClub) {
            throw new Error('No club returned');
          }
          return new Club(x.data.addClub);
        })
      );
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
      awaitRefetchQueries: true,
      refetchQueries: [
        {
          query: clubQuery,
          variables: {
            id: club.id,
          },
        },
      ],
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
      .pipe(
        map((x) => {
          if (!x.data?.updateClub) {
            throw new Error('No club returned');
          }
          return new Club(x.data.updateClub);
        })
      );
  }

  getClubs(args?: pageArgs) {
    let where: { [key: string]: unknown } = {};
    if (args?.query) {
      where = {
        $or: [
          {
            name: {
              $iLike: `%${args.query}%`,
            },
          },
          {
            fullName: {
              $iLike: `%${args.query}%`,
            },
          },
          {
            abbreviation: {
              $iLike: `%${args.query}%`,
            },
          },
        ],
      };
    }

    if (args?.ids) {
      where = {
        id: {
          in: args.ids,
        },
      };
    }

    return this.apollo
      .query<{
        clubs: {
          count: number;
          rows: Club[];
        };
      }>({
        query: clubsQuery,
        variables: {
          skip: args?.skip,
          take: args?.take,
          order: args?.order,
          where,
        },
      })
      .pipe(
        map((x) => {
          return {
            count: x.data.clubs.count,
            rows: x.data.clubs.rows.map((c) => new Club(c)),
          };
        })
      );
  }

  getTeamsForSubEvents(clubId: string, subEvents?: string[]) {
    let where: { [key: string]: unknown } = {};

    if (subEvents) {
      where = {
        subEventId: { ['$in']: subEvents },
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
          return (
            x.data.club.teams?.filter(
              (r) =>
                (r.entries?.length ?? 0) > 0 &&
                (r.entries?.[0].meta?.competition != null ||
                  r.entries?.[0].meta?.tournament != null)
            ) ?? []
          );
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
        map(
          (x) =>
            x.data.club.teams
              ?.map((r) =>
                r.entries?.map((r) => r.competitionSubEvent?.event?.startYear)
              )
              .flat()
              .filter((x, i, a) => a.indexOf(x) === i)
              .sort() ?? []
        )
      );
  }
}
