import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as moment from 'moment';
import { BehaviorSubject, combineLatest, Observable, Subject } from 'rxjs';
import {
  filter,
  finalize,
  map,
  scan,
  share,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs/operators';
import {
  Game,
  Player,
  PlayerService,
  SystemService,
} from '../../../../../_shared';

@Component({
  selector: 'app-games',
  templateUrl: './games.component.html',
  styleUrls: ['./games.component.scss'],
})
export class GamesComponent implements OnInit {
  games$: Observable<Game[]>;
  currentPage$ = new BehaviorSubject<number>(0);
  pageSize = 7;
  request$: Observable<any>;

  @Input()
  player: Player;

  constructor(
    private route: ActivatedRoute,
    private playerService: PlayerService,
    private systemService: SystemService,
    private changeDetector: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const reset$ = new Subject();

    const id$ = this.route.paramMap.pipe(
      tap((_) => reset$.next(undefined)),
      map((x) => x.get('id')),
      shareReplay(1)
    );

    const system$ = this.systemService
      .getPrimarySystem()
      .pipe(filter((x) => !!x));
    this.games$ = combineLatest([id$, system$, this.currentPage$]).pipe(
      switchMap(([playerId, system, page]) => {
        if (this.request$) {
          return this.request$;
        } else {
          this.request$ = this.playerService
            .getPlayerGames(
              playerId,
              system,
              page * this.pageSize,
              this.pageSize
            )
            .pipe(
              share(),
              finalize(() => this.onFinalize())
            );
          return this.request$;
        }
      }),
      scan((acc: any, newGames: Game[]) => {
        function sameEvent(game1: Game, game2: Game) {
          if (game1.tournament && game2.tournament) {
            return (
              game2.tournament.subEvent.event.id ===
              game1.tournament.subEvent.event.id
            );
          } else if (game1.competition && game2.competition) {
            return game2.competition.id === game1.competition.id;
          }

          return false;
        }
        if (newGames.length > 0) {
          // Find and match same event
          return newGames.reduce((all, curr) => {
            let prevWasSameEvent = false;
            if (all.length > 0) {
              const prevGame = all[all.length - 1][0];
              prevWasSameEvent = sameEvent(curr, prevGame);
            }
            if (prevWasSameEvent) {
              // Don't use a .push()
              // That doesn't trigger the change detection
              all[all.length - 1] = [...all[all.length - 1], curr];
            } else {
              all.push([curr]);
            }

            return all;
          }, acc);
        }
        return acc;
      }, [])
    );
  }

  public onScroll(): void {
    if (!this.request$) {
      this.currentPage$.next(this.currentPage$.value + 1);
    }
  }
  private onFinalize(): void {
    this.request$ = null;
  }
}
