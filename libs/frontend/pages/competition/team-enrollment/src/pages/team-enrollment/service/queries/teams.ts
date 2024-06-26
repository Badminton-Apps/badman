import { RankingSystemService } from '@badman/frontend-graphql';
import { Team } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { of } from 'rxjs';
import { map } from 'rxjs/operators';

export const loadTeams = (
  apollo: Apollo,
  systemService: RankingSystemService,

  clubId?: string | null,
  season?: number | null,
) => {
  if (!clubId || !season) {
    console.error('No clubId or season provided');
    return of([]);
  }

  return apollo
    .query<{
      teams: Team[];
    }>({
      fetchPolicy: 'network-only',
      query: gql`
        query TeamsForSeason_${season}_${season + 1}($where: JSONObject, $rankingWhere: JSONObject, $order: [SortOrderType!]) {
          teams(where: $where) {
            id
            name
            teamNumber
            type
            season
            link
            clubId
            preferredDay
            preferredTime
            prefferedLocationId
            captainId
            phone
            email
            players {
              id
              fullName
              gender
              teamMembership {
                id
                membershipType
              }
              rankingPlaces(where: $rankingWhere, order: $order, take: 1) {
                id
                single
                double
                mix
              }
            }
            entry {
              id
              sendOn
              standing {
                id
                riser
                faller
              }
              subEventCompetition {
                id
                level
                eventCompetition {
                  id
                  name
                  type
                }
              }
              meta {
                competition {
                  players {
                    id
                    gender
                    levelExceptionRequested
                    levelExceptionReason                    
                    player {
                      id
                      fullName
                      rankingPlaces(where: $rankingWhere, order: $order, take: 1) {
                        id
                        single
                        double
                        mix
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `,
      variables: {
        where: {
          clubId: clubId,
          season: {
            $or: [season - 1, season],
          },
        },
        rankingWhere: {
          systemId: systemService.systemId(),
          rankingDate: {
            $lte: new Date(season, 5, 10),
          },
        },
        order: [
          {
            field: 'rankingDate',
            direction: 'DESC',
          },
        ],
      },
    })
    .pipe(
      map((result) => result.data?.teams ?? []),
      map((result) => result?.map((t) => new Team(t))),
    );
};
