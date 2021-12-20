import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { RankingService } from 'app/admin';
import { DeviceService, Player, PlayerService, SystemService, UserService } from 'app/_shared';
import {
  BehaviorSubject,
  combineLatest,
  concat,
  forkJoin,
  lastValueFrom,
  withLatestFrom,
  merge,
  Observable,
  Subject,
  combineAll,
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
  private mobileQueryListener!: () => void;
  player$!: Observable<Player | null>;
  user$!: Observable<{ player: Player; request: any } | { player: null; request: null } | null>;

  canClaimAccount$!: Observable<{ isClaimedByUser: boolean; canClaim: boolean }>;

  updateHappend$ = new BehaviorSubject(null);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private playerService: PlayerService,
    private systemService: SystemService,
    private userService: UserService,
    private snackbar: MatSnackBar,

    public device: DeviceService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.device.addEvent('change', this.mobileQueryListener);
    this.mobileQueryListener = () => this.changeDetectorRef.detectChanges();

    const id$ = this.route.paramMap.pipe(
      tap((_) => this.updateHappend$.next(null)),
      delay(1),
      map((x) => x.get('id')),
      shareReplay(1)
    );

    const system$ = this.systemService.getPrimarySystem().pipe(filter((x) => !!x));

    this.player$ = merge(
      combineLatest([id$, system$, this.updateHappend$]).pipe(
        switchMap(([playerId, system]) => this.playerService.getPlayer(playerId!, system?.id)),
        map((player) => {
          if (!player) {
            throw new Error('No player found');
          }
          return player;
        })
      ),
      this.updateHappend$//.pipe(map(() => null)),
    ).pipe(
      // Forces a re-render when getting from cache
      delay(1),
      catchError((err, caught) => {
        console.error('error', err);
        this.snackbar.open(err.message);
        this.router.navigate(['/']);
        throw err;
      })
    );

    this.user$ = this.updateHappend$.pipe(switchMap((_) => this.userService.profile$));

    this.canClaimAccount$ = combineLatest([this.player$, this.user$]).pipe(
      map(([player, user]) => {
        if (!player) {
          return { canClaim: false, isUser: false, isClaimedByUser: false };
        }

        return {
          canClaim: !player.isClaimed && !user?.player && !user?.request,
          isUser: user?.player?.id === player?.id,
          isClaimedByUser: user && user.request && user.request.playerId === player.id,
        };
      }),
      startWith({ canClaim: false, isUser: false, isClaimedByUser: false })
    );
  }

  ngOnDestroy(): void {
    this.device.removeEvent('change', this.mobileQueryListener);
  }

  async claimAccount(playerId: string) {
    const result = await lastValueFrom(
      this.userService.requestLink(playerId).pipe(tap((_) => this.updateHappend$.next(null)))
    );

    if (result && result.id) {
      this.snackbar.open('Account linked', 'close', { duration: 5000 });
    } else {
      this.snackbar.open("Wasn't able to link the account", 'close', {
        duration: 5000,
      });
    }
  }
}
