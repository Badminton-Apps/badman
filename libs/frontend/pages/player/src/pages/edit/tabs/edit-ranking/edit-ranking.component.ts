import { CommonModule } from '@angular/common';
import { Component, Inject, Input, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { InMemoryCache } from '@apollo/client/core';
import { APOLLO_CACHE } from '@badman/frontend-graphql';
import { Player, RankingPlace, RankingSystem } from '@badman/frontend-models';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { BehaviorSubject, combineLatest, of } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';

@Component({
  selector: 'badman-edit-ranking',
  templateUrl: './edit-ranking.component.html',
  styleUrls: ['./edit-ranking.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    TranslateModule,
    FormsModule,
    MatInputModule,
    MatButtonModule,
  ],
})
export class EditRankingComponent implements OnInit {
  update$ = new BehaviorSubject(null);
  rankingForm!: FormGroup;

  allPlaces?: RankingPlace[][];

  @Input()
  player!: Player;

  system?: RankingSystem;
  rankingPlace?: RankingPlace;

  constructor(
    @Inject(APOLLO_CACHE) private cache: InMemoryCache,
    private appollo: Apollo,
    private _snackBar: MatSnackBar,
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
          : null,
      ),
      mergeMap((system) =>
        combineLatest([
          of(system),
          this.appollo.query<{ player: Partial<Player> }>({
            query: gql`
              query LastRanking($playerId: ID!, $system: String) {
                player(id: $playerId) {
                  id
                  rankingPlaces(
                    take: 1
                    order: { field: "rankingDate", direction: "desc" }
                    where: { systemId: $system }
                  ) {
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
        ]),
      ),
      map(([system, rankings]) => {
        return {
          system,
          player: new Player(rankings?.data?.player),
        };
      }),
    );

    getRanings$.subscribe(({ system, player }) => {
      const singleControl = new FormControl(
        player?.lastRanking?.single ?? system?.amountOfLevels ?? 0,
        [Validators.required],
      );
      const doubleControl = new FormControl(
        player?.lastRanking?.double ?? system?.amountOfLevels ?? 0,
        [Validators.required],
      );
      const mixControl = new FormControl(
        player?.lastRanking?.mix ?? system?.amountOfLevels ?? 0,
        [Validators.required],
      );

      if (!system) {
        throw new Error('System is not set');
      }

      this.system = system;
      this.rankingPlace = player?.lastRanking;

      this.rankingForm = new FormGroup({
        single: singleControl,
        double: doubleControl,
        mix: mixControl,
      });
    });
  }

  saveRanking() {
    if (this.rankingForm.valid) {
      if (!this.player) {
        throw new Error('Player is not set');
      }
      if (!this.player.id) {
        throw new Error('Player id is not set');
      }

      let mutation;
      const value = this.rankingForm.value;

      if (this.rankingPlace?.id) {
        mutation = {
          mutation: gql`
            mutation UpdateRanking($data: RankingPlaceUpdateInput!) {
              updateRankingPlace(data: $data) {
                id
              }
            }
          `,
          variables: {
            data: {
              id: this.rankingPlace?.id,
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
              }
            }
          `,
          variables: {
            data: {
              systemId: this.system?.id,
              playerId: this.player.id,
              single: +value.single,
              double: +value.double,
              mix: +value.mix,
              rankingDate: this.system?.calculationIntervalLastUpdate,
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
          this.invalidatePlayerRanking(
            new Player(
              result?.data?.updateRankingPlace ?? result?.data?.newRankingPlace,
            ),
          );
          this.update$.next(null);

          this._snackBar.open('Saved', undefined, {
            duration: 1000,
            panelClass: 'success',
          });
        });
    }
  }

  invalidatePlayerRanking(player: Player) {
    const normalizedIdPlayer = this.cache.identify({
      id: player?.id,
      __typename: 'Player',
    });
    this.cache.evict({ id: normalizedIdPlayer });

    // Clear from cache
    const normalizedIdLastRanking = this.cache.identify({
      id: player?.lastRanking?.id,
      __typename: 'RankingLastPlace',
    });
    this.cache.evict({ id: normalizedIdLastRanking });

    for (const ranking of player?.rankingPlaces ?? []) {
      const normalizedId = this.cache.identify({
        id: ranking?.id,
        __typename: 'RankingPlace',
      });
      this.cache.evict({ id: normalizedId });
    }

    this.cache.gc();
  }
}
