import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from 'app/player';
import { Observable, combineLatest } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { Player, User } from '../../models';
import { DeviceService } from '../../services';

@Component({
  templateUrl: './ranking-shell.component.html',
  styleUrls: ['./ranking-shell.component.scss'],
})
export class RankingShellComponent implements OnDestroy, OnInit {
  private mobileQueryListener: () => void;
  canViewRankingSimulations$: Observable<boolean>;
  canAcceptLinks$: Observable<boolean>;
  canViewData$: Observable<boolean>;
  canImportEvents$: Observable<boolean>;
  hasAdminItems$: Observable<boolean>;
  profile$: Observable<User>;

  constructor(
    private user: UserService,
    public device: DeviceService,
    private changeDetectorRef: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.device.addEvent('change', this.mobileQueryListener);
    this.mobileQueryListener = () => this.changeDetectorRef.detectChanges();

    this.canViewRankingSimulations$ = this.user.canCalculateRanking();
    this.canAcceptLinks$ = this.user.canAcceptLinks();
    this.canViewData$ = this.user.canViewEvents();
    this.canImportEvents$ = this.user.canImportEvents();

    // Has any admin permission show admin block
    this.hasAdminItems$ = combineLatest([
      this.canAcceptLinks$,
      this.canViewData$,
      this.canImportEvents$,
    ]).pipe(map((permissions) => permissions.some((t) => t == true)));

    this.profile$ = this.user.profile$.pipe(
      filter((x) => x !== null && x.player !== null),
      map((x) => x.player)
    );
  }

  ngOnDestroy(): void {
    this.device.removeEvent('change', this.mobileQueryListener);
  }

  playerSearch(player: Player) {
    if (player.id) {
      this.router.navigate(['/player', player.id]);
    }
  }
}
