import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Apollo, gql } from 'apollo-angular';
import { Player, PlayerService, RankingPlace, SystemService } from 'app/_shared';
import { combineLatest, debounceTime, of, take } from 'rxjs';
import { map, mergeMap, tap } from 'rxjs/operators';

@Component({
  selector: 'app-edit-ranking',
  templateUrl: './edit-ranking.component.html',
  styleUrls: ['./edit-ranking.component.scss'],
})
export class EditRankingComponent implements OnInit {
  rankingForm!: FormGroup;

  @Input()
  player!: Player;

  constructor(
    private systemService: SystemService,
    private playerService: PlayerService,
    private appollo: Apollo,
    private _snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.systemService
      .getPrimarySystem()
      .pipe(
        mergeMap((system) =>
          combineLatest([
            of(system),
            this.appollo
              .query<{ player: { lastRanking: Partial<RankingPlace> } }>({
                query: gql`
                  query LastRanking($playerId: ID!, $where: SequelizeJSON) {
                    player(id: $playerId) {
                      id
                      lastRanking(where: $where) {
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
                  where: {
                    systemId: system!.id,
                  },
                },
              })
              .pipe(map((r) => new RankingPlace(r?.data?.player?.lastRanking))),
          ])
        )
      )
      .subscribe(([system, lastPlace]) => {
        const singleControl = new FormControl(lastPlace?.single ?? system?.amountOfLevels ?? 0, [Validators.required]);
        const doubleControl = new FormControl(lastPlace?.double ?? system?.amountOfLevels ?? 0, [Validators.required]);
        const mixControl = new FormControl(lastPlace?.mix ?? system?.amountOfLevels ?? 0, [Validators.required]);

        this.rankingForm = new FormGroup({
          single: singleControl,
          double: doubleControl,
          mix: mixControl,
        });

        this.rankingForm.valueChanges.pipe(debounceTime(600)).subscribe((value) => {
          if (this.rankingForm.valid) {
            this.playerService
              .updatePlayerRanking(
                {
                  id: lastPlace?.id,
                  single: +value.single,
                  double: +value.double,
                  mix: +value.mix,
                },
                this.player.id!
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
