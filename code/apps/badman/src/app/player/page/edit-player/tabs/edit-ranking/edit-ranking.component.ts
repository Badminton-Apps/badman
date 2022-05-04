import { Component, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Apollo, gql } from 'apollo-angular';
import { Player, PlayerService, RankingPlace, SystemService } from '../../../../../_shared';
import { combineLatest, debounceTime, of } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';

@Component({
  selector: 'badman-edit-ranking',
  templateUrl: './edit-ranking.component.html',
  styleUrls: ['./edit-ranking.component.scss'],
})
export class EditRankingComponent implements OnInit {
  rankingForm!: FormGroup;

  allPlaces?: RankingPlace[][];

  @Input()
  player!: Player;

  constructor(
    private systemService: SystemService,
    private playerService: PlayerService,
    private appollo: Apollo,
    private _snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    const getRanings$ = this.systemService.getPrimarySystem().pipe(
      mergeMap((system) =>
        combineLatest([
          of(system),
          this.appollo.query<{ player: Partial<Player> }>({
            query: gql`
              query LastRanking($playerId: ID!, $system: String) {
                player(id: $playerId) {
                  id
                  lastRanking(system: $system) {
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
      const singleControl = new FormControl(player?.lastRanking?.single ?? system?.amountOfLevels ?? 0, [
        Validators.required,
      ]);
      const doubleControl = new FormControl(player?.lastRanking?.double ?? system?.amountOfLevels ?? 0, [
        Validators.required,
      ]);
      const mixControl = new FormControl(player?.lastRanking?.mix ?? system?.amountOfLevels ?? 0, [
        Validators.required,
      ]);

      this.rankingForm = new FormGroup({
        single: singleControl,
        double: doubleControl,
        mix: mixControl,
      });

      this.rankingForm.valueChanges.pipe(debounceTime(600)).subscribe((value) => {
        if (this.rankingForm.valid) {
          if (!this.player){
            throw new Error('Player is not set');
          }
          if (!this.player.id){
            throw new Error('Player id is not set');
          }

          this.playerService
            .updatePlayerRanking(
              {
                id: player?.lastRanking?.id,
                single: +value.single,
                double: +value.double,
                mix: +value.mix,
              },
              this.player.id
            )
            .subscribe(() => {
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
