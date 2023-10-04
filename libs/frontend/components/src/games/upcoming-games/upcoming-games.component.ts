import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  inject,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { RouterModule } from '@angular/router';
import { EncounterCompetition, Team } from '@badman/frontend-models';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';
import { MomentModule } from 'ngx-moment';
import { BehaviorSubject, Observable, map, scan, switchMap, tap } from 'rxjs';

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

  @Input() clubId?: string;
  @Input() teamId?: string;

  @Input() teams!: Team | Team[];

  upcomingEncounters$!: Observable<EncounterCompetition[]>;
  currentIndex$ = new BehaviorSubject<number>(0);

  hasHomeTeam = false;
  hasMoreToLoad = true;
  reset = false;

  readonly pageSize = 10;

  ngOnInit() {
    this.upcomingEncounters$ = this.currentIndex$.pipe(
      switchMap((offset) => {
        return this._loadUpcomingEncounters(
          Array.isArray(this.teams) ? this.teams : [this.teams],
          offset
        );
      }),
      scan((acc, curr) => {
        // reset the list
        if (this.reset) {
          this.reset = false;
          return acc;
        }
        // append the value
        return acc.concat(curr);
      }, [] as EncounterCompetition[])
    );
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
      this.reset = true;
      this.currentIndex$.next(0);
    }
  }

  private _loadUpcomingEncounters(teams: Team[], offset: number) {
    return this.apollo
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
                homeTeamId: teams.map((team) => team.id),
              },
              {
                awayTeamId: teams.map((team) => team.id),
              },
            ],
          },
          order: [
            {
              direction: 'asc',
              field: 'date',
            },
          ],
          skip: offset,
          take: this.pageSize,
        },
      })
      .pipe(
        // transferState(
        //   'upcommingKey-' + this.teamId ?? this.clubid,
        //   this.stateTransfer,
        //   this.platformId
        // ),
        map((result) => {
          return result?.data?.encounterCompetitions?.rows?.map(
            (encounter) => new EncounterCompetition(encounter)
          );
        }),
        map((encounters) => this._setHome(encounters ?? [])),
        tap((encounters) => {
          if (encounters.length < this.pageSize) {
            this.hasMoreToLoad = false;
          }
        })
      );
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
    this.currentIndex$.next(this.currentIndex$.value + this.pageSize);
  }
}
