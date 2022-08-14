import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Apollo, gql, QueryRef } from 'apollo-angular';
import { lastValueFrom, Observable } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';
import { Player, RankingPlace, RankingSystem } from '@badman/frontend/models';
import { EditRankingPlaceDialogComponent } from '../../dialogs/edit-ranking-place-dialog/edit-ranking-place-dialog.component';
import { SystemService } from '@badman/frontend/shared';

@Component({
  selector: 'badman-edit-ranking-all',
  templateUrl: './edit-ranking-all.component.html',
  styleUrls: ['./edit-ranking-all.component.scss'],
})
export class EditRankingAllComponent implements OnInit {
  allPlaces$?: Observable<[RankingPlace, RankingPlace[]][]>;
  query$?: QueryRef<
    { player: Partial<Player> },
    { playerId: string; system: string }
  >;

  currentOpen?: string;
  system!: RankingSystem;

  @Input()
  player!: Player;

  constructor(
    private systemService: SystemService,
    private appollo: Apollo,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.systemService
      .getPrimarySystemsWhere()
      .pipe(
        switchMap((where) =>
          this.appollo
            .query<{ rankingSystems: RankingSystem[] }>({
              query: gql`
                query GetPrimarySystemsInfoForRanking($where: JSONObject) {
                  rankingSystems(where: $where) {
                    id
                    rankingSystem
                    updateIntervalAmount
                    rankingGroups {
                      id
                      name
                      subEventCompetitions(take: 1) {
                        id
                        event {
                          id
                          startYear
                          usedRankingAmount
                          usedRankingUnit
                        }
                      }
                    }
                  }
                }
              `,
              variables: {
                where,
              },
            })
            .pipe(
              map(
                (result) => new RankingSystem(result.data.rankingSystems?.[0])
              )
            )
        )
      )
      .subscribe((system) => {
        this.system = system;

        if (!this.player) {
          throw new Error('Player is not set');
        }

        if (!this.player.id) {
          throw new Error('Player id is not set');
        }

        if (!this.system) {
          throw new Error('System is not set');
        }

        if (!this.system.id) {
          throw new Error('System id is not set');
        }

        this.query$ = this.appollo.watchQuery<
          { player: Partial<Player> },
          { playerId: string; system: string }
        >({
          query: gql`
            query AllRanking($playerId: ID!, $system: String) {
              player(id: $playerId) {
                id
                rankingPlaces(where: { systemId: $system }) {
                  id
                  rankingDate
                  single
                  mix
                  double
                  singlePoints
                  mixPoints
                  doublePoints
                  updatePossible
                }
              }
            }
          `,
          variables: {
            playerId: this.player.id,
            system: this.system.id,
          },
        });

        this.allPlaces$ = this.query$.valueChanges.pipe(
          filter(({ data, loading }) => !loading && !!data),
          map(({ data }) => new Player(data.player)),
          map((player) => {
            const allPlaces: Map<Date, RankingPlace[]> = new Map();
            allPlaces[Symbol.iterator] = function* () {
              yield* [...allPlaces.entries()].sort(
                (a, b) => b[0]?.getTime() - a[0]?.getTime()
              );
            };

            const sorted = player.rankingPlaces?.sort((a, b) => {
              if (!a.rankingDate || !b.rankingDate) {
                throw new Error('Ranking date is not set');
              }

              return b.rankingDate.getTime() - a.rankingDate.getTime();
            });

            let currUpdateDate: Date | null = new Date();

            for (const place of sorted ?? []) {
              if (place.updatePossible) {
                if (!place.rankingDate) {
                  throw new Error('Ranking date is not set');
                }
                allPlaces.set(place.rankingDate, [place]);
                currUpdateDate = place.rankingDate ?? null;
              } else {
                const oldPlace = allPlaces.get(currUpdateDate);
                if (oldPlace) {
                  allPlaces.set(currUpdateDate, [...oldPlace, place]);
                } else {
                  allPlaces.set(currUpdateDate, [place]);
                }
              }
            }

            const returnBlock: [RankingPlace, RankingPlace[]][] = [];

            for (const [, places] of allPlaces) {
              if (!places) {
                throw new Error('Places is not set');
              }

              const place = places.find((p) => p.updatePossible);
              if (!place) {
                throw new Error('Place is not set');
              }

              returnBlock.push([place, places]);
            }

            return returnBlock;
          })
        );
      });
  }

  editRanking(place?: RankingPlace) {
    this.dialog
      .open(EditRankingPlaceDialogComponent, {
        data: {
          place: {
            ...place,
            playerId: this.player.id,
          },
          system: this.system,
        },
      })
      .afterClosed()
      .subscribe(
        (result: {
          action?: 'update' | 'remove' | 'add';
          place: RankingPlace;
        }) => {
          if (result?.action) {
            lastValueFrom(
              this.appollo.mutate({
                mutation: gql`
                mutation UpdateRankingPlace($rankingPlace: RankingPlaceInput!) {
                  ${result.action}RankingPlace(rankingPlace: $rankingPlace) {
                    id
                  }
                }
              `,
                variables: {
                  rankingPlace: result.place,
                },
              })
            ).then(() => this.query$?.refetch());
          }
        }
      );
  }
}
