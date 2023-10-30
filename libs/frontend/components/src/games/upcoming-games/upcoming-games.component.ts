import { CommonModule } from '@angular/common';
import {
  Component,
  Injector,
  Input,
  OnChanges,
  OnInit,
  PLATFORM_ID,
  Signal,
  SimpleChanges,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { TransferState } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { EncounterCompetition, Team } from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';
import { MomentModule } from 'ngx-moment';
import { map, scan, tap } from 'rxjs';

@Component({
  selector: 'badman-upcoming-games',
  standalone: true,
  imports: [
    CommonModule,
    MatListModule,
    MomentModule,
    TranslateModule,
    MatButtonModule,
    RouterModule,
  ],
  templateUrl: './upcoming-games.component.html',
  styleUrls: ['./upcoming-games.component.scss'],
})
export class UpcomingGamesComponent implements OnInit, OnChanges {
  private apollo = inject(Apollo);
  private stateTransfer = inject(TransferState);
  private platformId = inject(PLATFORM_ID);
  private injector = inject(Injector);

  @Input() clubId?: string;
  @Input() teamId?: string;

  @Input() teams!: Team | Team[];

  hasHomeTeam = false;
  hasMoreToLoad = true;

  teamIds = signal<string[]>([]);
  offset = signal(0);
  upcomingEncounters!: Signal<EncounterCompetition[]>;

  readonly pageSize = 10;

  constructor() {
    effect(() => {
      this.upcomingEncounters = this._loadUpcomingEncounters();
    });
  }

  ngOnInit() {
    this._setIds();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      !changes['clubid']?.previousValue &&
      !changes['teamId']?.previousValue &&
      !changes['teams']?.previousValue
    ) {
      return;
    }

    // Reset the list when the id changes
    if (
      changes['clubid']?.currentValue !== changes['clubid']?.previousValue ||
      changes['teamId']?.currentValue !== changes['teamId']?.previousValue ||
      JSON.stringify(changes['teams']?.currentValue) !==
        JSON.stringify(changes['teams']?.previousValue)
    ) {
      this._setIds();
      this.offset.set(0);
    }
  }

  private _setIds() {
    const teamids: string[] = [];

    if (this.teamId) {
      teamids.push(this.teamId);
    }

    if (this.teams instanceof Team && this.teams.id) {
      teamids.push(this.teams.id);
    }

    if (this.teams instanceof Array) {
      teamids.push(...this.teams.map((t) => t.id ?? ''));
    }
    this.teamIds.set(teamids);
  }

  private _loadUpcomingEncounters() {
    return toSignal(
      this.apollo
        .query<{
          encounterCompetitions: {
            rows: Partial<EncounterCompetition>[];
          };
        }>({
          query: gql`
            query UpcomingGames(
              $where: JSONObject
              $take: Int
              $skip: Int
              $order: [SortOrderType!]
            ) {
              encounterCompetitions(
                where: $where
                order: $order
                take: $take
                skip: $skip
              ) {
                rows {
                  id
                  date
                  home {
                    id
                    name
                    abbreviation
                    slug
                    club {
                      id
                      slug
                    }
                  }
                  away {
                    id
                    name
                    abbreviation
                    slug
                    club {
                      id
                      slug
                    }
                  }
                }
              }
            }
          `,
          variables: {
            where: {
              date: {
                $gte: moment().format('YYYY-MM-DD'),
              },
              $or: [
                {
                  homeTeamId: this.teamIds(),
                },
                {
                  awayTeamId: this.teamIds(),
                },
              ],
            },
            order: [
              {
                direction: 'asc',
                field: 'date',
              },
            ],
            skip: this.offset(),
            take: this.pageSize,
          },
        })
        .pipe(
          transferState(
            'upcommingKey-' + this.teamIds().join('-'),
            this.stateTransfer,
            this.platformId,
          ),
          map((result) => {
            return result?.data?.encounterCompetitions?.rows?.map(
              (encounter) => new EncounterCompetition(encounter),
            );
          }),
          map((encounters) => this._setHome(encounters ?? [])),
          tap((encounters) => {
            if (encounters.length < this.pageSize) {
              this.hasMoreToLoad = false;
            }
          }),
          scan((acc, curr) => {
            // reset the list if the offset is 0
            if (this.offset() === 0) {
              return acc;
            }

            // append the value
            return acc.concat(curr);
          }),
        ),
      { injector: this.injector },
    ) as Signal<EncounterCompetition[]>;
  }

  private _setHome(encounters: EncounterCompetition[]) {
    if (!this.clubId && !this.teamId) {
      return encounters;
    }

    this.hasHomeTeam = true;

    return encounters.map((r) => {
      if (r.home?.club?.id === this.clubId || r.home?.id === this.teamId) {
        r.showingForHomeTeam = true;
      } else {
        r.showingForHomeTeam = false;
      }
      return r;
    });
  }

  loadMore() {
    this.offset.set(this.offset() + this.pageSize);
  }

  trackById(index: number, item: Partial<{ id: string }>) {
    return item.id;
  }
}
