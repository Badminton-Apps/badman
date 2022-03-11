import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { UserService } from 'app/_shared';
import { environment } from 'environments/environment';
import { combineLatest, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { EventType, Player } from '../../models';
import { DeviceService, EventService, SystemService } from '../../services';

@Component({
  templateUrl: './ranking-shell.component.html',
  styleUrls: ['./ranking-shell.component.scss'],
})
export class RankingShellComponent implements OnDestroy, OnInit {
  private mobileQueryListener!: () => void;
  profile$!: Observable<Player>;
  canEnroll$!: Observable<boolean>;
  version: string = environment.version;

  constructor(
    private user: UserService,
    public device: DeviceService,
    private changeDetectorRef: ChangeDetectorRef,
    private apollo: Apollo
  ) {}

  ngOnInit() {
    this.device.addEvent('change', this.mobileQueryListener);
    this.mobileQueryListener = () => this.changeDetectorRef.detectChanges();

    this.profile$ = this.user.profile$.pipe(
      filter((x) => x !== null && x?.player !== null),
      map((x) => x!.player)
    ) as Observable<Player>;

    this.canEnroll$ = this.apollo
      .query<{ tournamentEvents: { total: number }; competitionEvents: { total: number } }>({
        query: gql`
          # we request only one, because if it's more that means it's open
          query CanEnroll($where: SequelizeJSON) {
            tournamentEvents(first: 1, where: $where) {
              total
              edges {
                cursor
              }
            }
            competitionEvents(first: 1, where: $where) {
              total
              edges {
                cursor
              }
            }
          }
        `,
        variables: {
          where: {
            allowEnlisting: true,
          },
        },
      })
      .pipe(map((events) => events.data.tournamentEvents.total != 0 || events.data.competitionEvents.total != 0));
  }

  ngOnDestroy(): void {
    this.device.removeEvent('change', this.mobileQueryListener);
  }
}
