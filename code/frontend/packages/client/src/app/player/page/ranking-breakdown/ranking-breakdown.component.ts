import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { RankingService } from 'app/admin';
import { Player, PlayerService, SystemService } from 'app/_shared';
import { tap, delay, map, shareReplay, filter, merge, combineLatest, switchMap, catchError, Observable, Subject } from 'rxjs';

@Component({
  templateUrl: './ranking-breakdown.component.html',
  styleUrls: ['./ranking-breakdown.component.scss']
})
export class RankingBreakdownComponent implements OnInit {
  player$!: Observable<Player>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private playerService: PlayerService,
    private systemService: SystemService,
    private rankingService: RankingService,
    private snackbar: MatSnackBar,
  ) { }

  ngOnInit(): void {
    const reset$ = new Subject();
   
    const id$ = this.route.paramMap.pipe(
      tap((_) => reset$.next(undefined)),
      delay(1),
      map((x) => x.get('id')),
      shareReplay(1)
    );

    const system$ = this.systemService.getPrimarySystem().pipe(filter((x) => !!x));

    this.player$ = merge(
      reset$,
      combineLatest([id$, system$]).pipe(
        switchMap(([playerId, system]) => this.playerService.getPlayer(playerId!, system?.id)),
        map((player) => {
          if (!player) {
            throw new Error('No player found');
          }
          // this.setStaticsUrl(player);
          return player;
        }),
        catchError((err, caught) => {
          console.error('error', err);
          this.snackbar.open(err.message);
          this.router.navigate(['/']);
          throw err;
        })
      )
    ) as Observable<Player>;
  }

  private setStaticsUrl(player: Player) {
    player.rankingPlaces = player.rankingPlaces?.map((ranking) => {
      ranking.statisticUrl = this.rankingService.getStatisticUrl(ranking.rankingSystem!.id!, player.id!);
      return ranking;
    });
    return player;
  }

}
