import { Component, Input, OnInit } from '@angular/core';
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
  pageSize = 20;
  request$: Observable<any>;

  @Input()
  player: Player;

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

    const system$ = this.systemService.getSystems(true).pipe(
      filter((x) => !!x),
      filter((x) => x.length > 0),
      map((x) => x[0])
    );
    this.games$ = combineLatest([id$, system$, this.currentPage$]).pipe(
      switchMap(([playerId, system, page]) => {
        if (this.request$) {
          return this.request$;
        } else {
          this.request$ = this.playerService
            .getPlayerGames(
              playerId,
              system.id,
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
        function sameEvent(game1, game2) {
          if (game1.subEvent === null && game2.subEvent == null) {
            return true;
          } else if (game1.subEvent === null || game2.subEvent == null) {
            return false;
          } else {
            if (game1.subEvent.event === null && game2.subEvent.event == null) {
              return true;
            } else if (game1.subEvent.event === null || game2.subEvent.event == null) {
              return false;
            } else {
              if (game1.subEvent.event.type === 'TOERNAMENT') {
                return game2.subEvent.event.id === game1.subEvent.event.id;
              } else {
                return (
                  game2.subEvent.event.id === game1.subEvent.event.id &&
                  moment(game2.playedAt).isSame(game1.playedAt, 'day')
                );
              }
            }
          }
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
              all[all.length - 1].push(curr);
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
