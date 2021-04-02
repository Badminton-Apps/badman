import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from 'app/player';
import { Observable, combineLatest } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';
import { Player } from '../../models';
import { DeviceService } from '../../services';

@Component({
  templateUrl: './ranking-shell.component.html',
  styleUrls: ['./ranking-shell.component.scss'],
})
export class RankingShellComponent implements OnDestroy, OnInit {
  private mobileQueryListener: () => void;
  profile$: Observable<Player>;

  constructor(
    private user: UserService,
    public device: DeviceService,
    private changeDetectorRef: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.device.addEvent('change', this.mobileQueryListener);
    this.mobileQueryListener = () => this.changeDetectorRef.detectChanges();

    this.profile$ = this.user.profile$.pipe(
      filter((x) => x !== null && x.player !== null),
      map((x) => x.player),
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
