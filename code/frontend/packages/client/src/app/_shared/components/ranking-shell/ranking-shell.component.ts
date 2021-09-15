import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from 'app/player';
import { Observable, combineLatest } from 'rxjs';
import { combineAll, filter, map, tap } from 'rxjs/operators';
import { EventType, Player } from '../../models';
import { DeviceService, EventService } from '../../services';
import { version } from '../../../../../package.json';

@Component({
  templateUrl: './ranking-shell.component.html',
  styleUrls: ['./ranking-shell.component.scss'],
})
export class RankingShellComponent implements OnDestroy, OnInit {
  private mobileQueryListener: () => void;
  profile$: Observable<Player>;
  canEnroll$: Observable<boolean>;
  version: string = version;

  constructor(
    private user: UserService,
    public device: DeviceService,
    private changeDetectorRef: ChangeDetectorRef,
    private router: Router,
    private eventService: EventService
  ) {}

  async ngOnInit(): Promise<void> {
    this.device.addEvent('change', this.mobileQueryListener);
    this.mobileQueryListener = () => this.changeDetectorRef.detectChanges();

    this.profile$ = this.user.profile$.pipe(
      filter((x) => x !== null && x.player !== null),
      map((x) => x.player)
    );

    this.canEnroll$ = combineLatest([
      this.eventService.getEvents({
        type: EventType.COMPETITION,
        where: {
          allowEnlisting: true,
        },
      }),
      this.eventService.getEvents({
        type: EventType.TOURNAMENT,
        where: {
          allowEnlisting: true,
        },
      }),
    ]).pipe(map(([a, b]) => a.eventCompetitions.edges.length != 0 || b.eventTournaments.edges.length != 0));
    
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
