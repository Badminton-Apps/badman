import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { Player } from '../../models';
import { DeviceService, UserService } from '../../services';

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
      filter((x) => x !== null),
    ) as Observable<Player>;

    this.canEnroll$ = this.apollo
      .query<{
        tournamentEvents: { total: number };
        competitionEvents: { total: number };
      }>({
        query: gql`
          # we request only first one, because if it's more that means it's open
          query CanEnroll($where: JSONObject) {
            # tournamentEvents(first: 1, where: $where) {
            #   total
            #   edges {
            #     cursor
            #   }
            # }
            eventCompetitions(take: 1, where: $where) {
              id
            }
          }
        `,
        variables: {
          where: {
            allowEnlisting: true,
          },
        },
      })
      .pipe(
        map(
          (events) =>
            events?.data?.tournamentEvents?.total != 0 ||
            events?.data?.competitionEvents?.total != 0
        )
      );
  }

  ngOnDestroy(): void {
    this.device.removeEvent('change', this.mobileQueryListener);
  }
}
