import { CommonModule } from '@angular/common';
import { Component, OnInit, input, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RankingSystemService } from '@badman/frontend-graphql';
import { Player, RankingPlace, RankingSystem } from '@badman/frontend-models';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, QueryRef, gql } from 'apollo-angular';
import { Observable, lastValueFrom } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { EditRankingPlaceDialogComponent } from '../../dialogs/edit-ranking-place-dialog/edit-ranking-place-dialog.component';

@Component({
  selector: 'badman-edit-ranking-all',
  templateUrl: './edit-ranking-all.component.html',
  styleUrls: ['./edit-ranking-all.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    MatExpansionModule,
    MatListModule,
    MatTooltipModule,
    MatDialogModule,
    MatButtonModule,
  ],
})
export class EditRankingAllComponent implements OnInit {
  private systemService = inject(RankingSystemService);
  private appollo = inject(Apollo);
  private dialog = inject(MatDialog);
  allPlaces$?: Observable<[RankingPlace | undefined, RankingPlace[]][]>;
  query$?: QueryRef<{ player: Partial<Player> }, { playerId: string; system: string }>;

  currentOpen?: string;
  system!: RankingSystem;

  player = input.required<Player>();

  ngOnInit() {
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
                subEventCompetitions {
                  id
                  eventCompetition {
                    id
                    season
                    usedRankingAmount
                    usedRankingUnit
                  }
                }
              }
            }
          }
        `,
        variables: {
          where: {
            id: this.systemService.systemId(),
          },
        },
      })
      .pipe(map((result) => new RankingSystem(result.data.rankingSystems?.[0])))
      .subscribe((system) => {
        this.system = system;

        if (!this.player()) {
          throw new Error('Player is not set');
        }

        if (!this.player().id) {
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
            playerId: this.player().id,
            system: this.system.id,
          },
        });

        this.allPlaces$ = this.query$.valueChanges.pipe(
          filter(({ data, loading }) => !loading && !!data),
          map(({ data }) => new Player(data.player)),
          map((player) => {
            const allPlaces: Map<Date, RankingPlace[]> = new Map();
            allPlaces[Symbol.iterator] = function* () {
              yield* [...allPlaces.entries()].sort((a, b) => b[0]?.getTime() - a[0]?.getTime());
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

            const returnBlock: [RankingPlace | undefined, RankingPlace[]][] = [];

            for (const [, places] of allPlaces) {
              if (!places) {
                throw new Error('Places is not set');
              }

              const place = places.find((p) => p.updatePossible);
              returnBlock.push([place, places]);
            }

            return returnBlock;
          }),
        );
      });
  }

  editRanking(place?: RankingPlace) {
    this.dialog
      .open(EditRankingPlaceDialogComponent, {
        data: {
          place: {
            ...place,
            playerId: this.player().id,
          },
          system: this.system,
        },
      })
      .afterClosed()
      .subscribe((result: { action?: 'update' | 'remove' | 'new'; place: RankingPlace }) => {
        if (result?.action) {
          let mutation;

          switch (result.action) {
            case 'update':
              mutation = this.appollo.mutate({
                mutation: gql`
                  mutation UpdateRankingPlace($rankingPlace: RankingPlaceUpdateInput!) {
                    updateRankingPlace(data: $rankingPlace) {
                      id
                    }
                  }
                `,
                variables: {
                  rankingPlace: result.place,
                },
              });
              break;
            case 'new':
              mutation = this.appollo.mutate({
                mutation: gql`
                  mutation UpdateRankingPlace($rankingPlace: RankingPlaceNewInput!) {
                    newRankingPlace(data: $rankingPlace) {
                      id
                    }
                  }
                `,
                variables: {
                  rankingPlace: result.place,
                },
              });
              break;

            case 'remove':
              mutation = this.appollo.mutate({
                mutation: gql`
                  mutation RemoveRankingPlace($id: ID!) {
                    removeRankingPlace(id: $id)
                  }
                `,
                variables: {
                  id: result.place.id,
                },
              });

              break;
          }

          lastValueFrom(mutation).then(() => this.query$?.refetch());
        }
      });
  }
}
