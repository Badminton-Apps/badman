import { Component, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Apollo, gql } from 'apollo-angular';
import { Player, RankingPlace, RankingSystem } from '@badman/frontend/models';
import { BehaviorSubject, combineLatest, debounceTime, of } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { PlayerService } from '@badman/frontend/shared';

@Component({
  selector: 'badman-edit-ranking',
  templateUrl: './edit-ranking.component.html',
  styleUrls: ['./edit-ranking.component.scss'],
})
export class EditRankingComponent implements OnInit {
  update$ = new BehaviorSubject(null);
  rankingForm!: FormGroup;

  allPlaces?: RankingPlace[][];

  @Input()
  player!: Player;

  constructor(
    private playerService: PlayerService,
    private appollo: Apollo,
    private _snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    const getRanings$ = combineLatest([
      this.appollo.query<{ rankingSystems: Partial<RankingSystem>[] }>({
        query: gql`
          query GetPrimarySystemsQuery($where: JSONObject) {
            rankingSystems(where: $where) {
              id
              primary
              amountOfLevels
              caluclationIntervalLastUpdate
              differenceForUpgrade
              differenceForDowngrade
            }
          }
        `,
        variables: {
          where: {
            primary: true,
          },
        },
      }),
      this.update$,
    ]).pipe(
      map(([x]) =>
        x.data?.rankingSystems?.length > 0
          ? new RankingSystem(x.data.rankingSystems[0])
          : null
      ),
      mergeMap((system) =>
        combineLatest([
          of(system),
          this.appollo.query<{ player: Partial<Player> }>({
            query: gql`
              query LastRanking($playerId: ID!, $system: String) {
                player(id: $playerId) {
                  id
                  rankingPlaces(take: 1, where: { systemId: $system }) {
                    id
                    single
                    mix
                    double
                  }
                }
              }
            `,
            variables: {
              playerId: this.player.id,
              system: system?.id,
            },
          }),
        ])
      ),
      map(([system, rankings]) => {
        return {
          system,
          player: new Player(rankings?.data?.player),
        };
      })
    );

    getRanings$.subscribe(({ system, player }) => {
      const singleControl = new FormControl(
        player?.lastRanking?.single ?? system?.amountOfLevels ?? 0,
        [Validators.required]
      );
      const doubleControl = new FormControl(
        player?.lastRanking?.double ?? system?.amountOfLevels ?? 0,
        [Validators.required]
      );
      const mixControl = new FormControl(
        player?.lastRanking?.mix ?? system?.amountOfLevels ?? 0,
        [Validators.required]
      );

      this.rankingForm = new FormGroup({
        single: singleControl,
        double: doubleControl,
        mix: mixControl,
      });

      this.rankingForm.valueChanges
        .pipe(debounceTime(600))
        .subscribe((value) => {
          if (this.rankingForm.valid) {
            if (!this.player) {
              throw new Error('Player is not set');
            }
            if (!this.player.id) {
              throw new Error('Player id is not set');
            }

            let mutation;

            if (player?.lastRanking?.id) {
              mutation = {
                mutation: gql`
                  mutation UpdateRanking($data: RankingPlaceUpdateInput!) {
                    updateRankingPlace(data: $data) {
                      id
                      rankingLastPlaces {
                        id
                      }
                      rankingPlaces {
                        id
                      }
                    }
                  }
                `,
                variables: {
                  data: {
                    id: player?.lastRanking?.id,
                    single: +value.single,
                    double: +value.double,
                    mix: +value.mix,
                  },
                },
              };
            } else {
              mutation = {
                mutation: gql`
                  mutation NewRanking($data: RankingPlaceNewInput!) {
                    newRankingPlace(data: $data) {
                      id
                      rankingLastPlaces {
                        id
                      }
                      rankingPlaces {
                        id
                      }
                    }
                  }
                `,
                variables: {
                  data: {
                    systemId: system?.id,
                    playerId: this.player.id,
                    single: +value.single,
                    double: +value.double,
                    mix: +value.mix,
                    rankingDate: system?.caluclationIntervalLastUpdate,
                    updatePossible: true,
                  },
                },
              };
            }

            this.appollo
              .mutate<{
                updateRankingPlace?: Player;
                newRankingPlace?: Player;
              }>(mutation)
              .subscribe((result) => {
                this.playerService.invalidatePlayerRanking(
                  new Player(
                    result?.data?.updateRankingPlace ??
                      result?.data?.newRankingPlace
                  )
                );
                this.update$.next(null);

                this._snackBar.open('Saved', undefined, {
                  duration: 1000,
                  panelClass: 'success',
                });
              });
          }
        });
    });
  }
}
