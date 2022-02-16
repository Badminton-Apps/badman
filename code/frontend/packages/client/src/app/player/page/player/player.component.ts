import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { DeviceService, Player, PlayerService, SystemService, UserService } from 'app/_shared';
import {
  BehaviorSubject,
  combineLatest, lastValueFrom, Observable
} from 'rxjs';
import {
  catchError, filter,
  map,
  share, startWith,
  switchMap,
  tap
} from 'rxjs/operators';

@Component({
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.scss'],
})
export class PlayerComponent implements OnInit, OnDestroy {
  private mobileQueryListener!: () => void;
  player$!: Observable<Player | null>;
  user$!: Observable<{ player: Player; request: any } | { player: null; request: null } | null>;
  loadingPlayer = false;

  canClaimAccount$!: Observable<{ isClaimedByUser: boolean; canClaim: boolean }>;

  updateHappend$ = new BehaviorSubject(null);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private playerService: PlayerService,
    private systemService: SystemService,
    private userService: UserService,
    private snackbar: MatSnackBar,
    private titleService: Title,
    public device: DeviceService
  ) {}

  ngOnInit(): void {
    const id$ = this.route.paramMap.pipe(map((x) => x.get('id')));

    this.player$ = combineLatest([id$, this.updateHappend$]).pipe(
      share(),
      switchMap(([playerId]) => this.playerService.getPlayer(playerId!)),
      map((player) => {
        if (!player) {
          throw new Error('No player found');
        }
        return player; 
      }),
      tap((player) => this.titleService.setTitle(`${player!.fullName}`)),
      catchError((err, caught) => {
        console.error('error', err);
        this.snackbar.open(err.message);
        this.router.navigate(['/']);
        throw err;
      }),
      share()
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
