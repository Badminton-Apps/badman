import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { RankingService } from 'app/admin';
import { UserService } from 'app/player/services';
import {
  DeviceService,
  Player,
  PlayerService,
  SystemService,
} from 'app/_shared';
import {
  BehaviorSubject,
  combineLatest,
  merge,
  Observable,
  Subject,
  throwError,
} from 'rxjs';
import {
  catchError,
  delay,
  filter,
  map,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from 'rxjs/operators';

@Component({
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.scss'],
})
export class PlayerComponent implements OnInit, OnDestroy {
  private mobileQueryListener: () => void;
  player$: Observable<Player>;
  user$: Observable<{ player: Player; request: any }>;

  canClaimAccount$: Observable<{ canClaim: boolean; isClaimedByUser: boolean }>;

  updateHappend = new BehaviorSubject(true);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private playerService: PlayerService,
    private systemService: SystemService,
    private rankingService: RankingService,
    private userService: UserService,
    private snackbar: MatSnackBar,

    public device: DeviceService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.device.addEvent('change', this.mobileQueryListener);
    this.mobileQueryListener = () => this.changeDetectorRef.detectChanges();

    const reset$ = new Subject();

    const id$ = this.route.paramMap.pipe(
      tap((_) => reset$.next(undefined)),
      delay(1),
      map((x) => x.get('id')),
      shareReplay(1)
    );

    const system$ = this.systemService
      .getPrimarySystem()
      .pipe(filter((x) => !!x));

    this.player$ = merge<Player>(
      reset$,
      combineLatest([id$, system$]).pipe(
        switchMap(([playerId, system]) =>
          this.playerService.getPlayer(playerId, system.id)
        ),
        map((player) => {
          if (!player) {
            throw new Error('No player found');
          }
          return this.setStaticsUrl(player);
        }),
        catchError((err, caught) => {
          console.error('error', err);
          this.snackbar.open(err.message);
          this.router.navigate(['/']);
          return throwError(err);
        })
      )
    );

    this.user$ = this.updateHappend.pipe(
      switchMap((_) => this.userService.profile$)
    );

    this.canClaimAccount$ = combineLatest([this.player$, this.user$]).pipe(
      map(([player, user]) => {
        if (!player) {
          return { canClaim: false, isUser: false, isClaimedByUser: false };
        }

        return {
          canClaim: !player.isClaimed && !user?.player && !user?.request,
          isUser: user?.player?.id === player?.id,
          isClaimedByUser:
            user && user.request && user.request.playerId === player.id,
        };
      }),
      startWith({ canClaim: false,  isUser: false, isClaimedByUser: false }),
      tap(r => console.log(r))
    );
  }

  ngOnDestroy(): void {
    this.device.removeEvent('change', this.mobileQueryListener);
  }

  private setStaticsUrl(player: Player) {
    player.rankingPlaces = player.rankingPlaces?.map((ranking) => {
      ranking.statisticUrl = this.rankingService.getStatisticUrl(
        ranking.rankingSystem.id,
        player.id
      );
      return ranking;
    });
    return player;
  }

  async claimAccount(playerId: string) {
    const result = await this.userService
      .requestLink(playerId)
      .pipe(tap((_) => this.updateHappend.next(true)))
      .toPromise();

    if (result && result.id) {
      this.snackbar.open('Account link requested', 'close', { duration: 5000 });
    } else {
      this.snackbar.open("Wasn't able to link the account", 'close', {
        duration: 5000,
      });
    }
  }
}
