import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, Observable, Subject } from 'rxjs';
import { filter, map, shareReplay, switchMap, tap } from 'rxjs/operators';
import { Player, PlayerService, RankingSystem, SystemService } from '../../../../../_shared';

@Component({
  selector: 'app-ranking-evolution',
  templateUrl: './ranking-evolution.component.html',
  styleUrls: ['./ranking-evolution.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RankingEvolutionComponent implements OnInit {
  @Input()
  player!: Player;

  rankingPlaces$?: Observable<{
    single: { level: number; rankingDate: Date; points: number; pointsDowngrade: number; updatePossible: boolean }[];
    mix: { level: number; rankingDate: Date; points: number; pointsDowngrade: number; updatePossible: boolean }[];
    double: { level: number; rankingDate: Date; points: number; pointsDowngrade: number; updatePossible: boolean }[];
  }>;
  request$!: Observable<any>;
  rankingSystem!: RankingSystem;

  constructor(
    private route: ActivatedRoute,
    private playerService: PlayerService,
    private systemService: SystemService
  ) {}

  ngOnInit(): void {
    const reset$ = new Subject();

    const id$ = this.route.paramMap.pipe(
      tap((_) => reset$.next(undefined)),
      map((x) => x.get('id')),
      shareReplay(1)
    );

    const system$ = this.systemService.getPrimarySystem().pipe(filter((x) => !!x));

    this.rankingPlaces$ = combineLatest([id$, system$]).pipe(
      tap(([playerId, system]) => (this.rankingSystem = system!)),
      switchMap(([playerId, system]) => this.playerService.getPlayerEvolution(playerId!, system!.id!)),
      map((x) => {
        return x.reduce(
          (acc: any, value) => {
            return {
              single: [
                ...acc.single,
                {
                  level: value.single,
                  rankingDate: value.rankingDate,
                  points: value.singlePoints,
                  pointsDowngrade: value.singlePointsDowngrade,
                  updatePossible: value.updatePossible,
                },
              ],
              double: [
                ...acc.double,
                {
                  level: value.double,
                  rankingDate: value.rankingDate,
                  points: value.doublePoints,
                  pointsDowngrade: value.doublePointsDowngrade,
                  updatePossible: value.updatePossible,
                },
              ],
              mix: [
                ...acc.mix,
                {
                  level: value.mix,
                  rankingDate: value.rankingDate,
                  points: value.mixPoints,
                  pointsDowngrade: value.mixPointsDowngrade,
                  updatePossible: value.updatePossible,
                },
              ],
            };
          },
          { single: [], double: [], mix: [] }
        );
      })
    );
  }
}
