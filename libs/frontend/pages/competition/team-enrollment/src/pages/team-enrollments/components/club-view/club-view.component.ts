import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Apollo, gql } from 'apollo-angular';
import { Club, EventCompetition } from '@badman/frontend-models';
import { combineLatest, map, Observable, startWith, switchMap, tap } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCardModule } from '@angular/material/card';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MomentModule } from 'ngx-moment';
import { OverlayModule } from '@angular/cdk/overlay';

@Component({
  selector: 'badman-club-view',
  templateUrl: './club-view.component.html',
  styleUrls: ['./club-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    MomentModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatOptionModule,
    MatSelectModule,
    MatExpansionModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    OverlayModule
],
})
export class ClubViewComponent implements OnInit {
  overlayOpen = '';

  yearControl: FormControl = new FormControl(2022);
  eventControl: FormControl = new FormControl();
  loading = false;

  clubs$!: Observable<(Club & { hasLocation: boolean })[]>;
  events$!: Observable<EventCompetition[]>;

  constructor(private _apollo: Apollo) {}

  ngOnInit(): void {
    this.clubs$ = combineLatest([
      this.eventControl.valueChanges,
      this.yearControl.valueChanges
    ]).pipe(
      tap(() => (this.loading = true)),

      switchMap(([eventId]) => {
        if (eventId == 'all') {
          return this.events$.pipe(
            map((e) => {
              return {
                data: {
                  eventCompetition: {
                    subEventCompetitions: e
                      .map((e) => e.subEventCompetitions)
                      .flat(),
                  },
                },
              };
            })
          );
        } else {
          return this._apollo.query<{
            eventCompetition: Partial<EventCompetition>;
          }>({
            query: gql`
              query CompetitionEvent($id: ID!) {
                eventCompetition(id: $id) {
                  id
                  subEventCompetitions {
                    id
                    eventEntries {
                      id
                      team {
                        id
                        clubId
                      }
                    }
                  }
                }
              }
            `,
            variables: {
              id: eventId,
            },
          });
        }
      }),
      map((result) => {
        return {
          clubIds: [
            ...new Set(
              result.data.eventCompetition.subEventCompetitions
                ?.map((s) => s?.eventEntries?.map((e) => e.team?.clubId))
                ?.flat()
            ),
          ],
        };
      }),
      // Distinct
      switchMap(({ clubIds }) => {
        const clubWhere =
          this.eventControl.value != 'all'
            ? {
                id: clubIds,
              }
            : undefined;

        return this._apollo.query<{
          clubs: {
            rows: Partial<Club>[];
          };
        }>({
          query: gql`
            query Clubs($where: JSONObject, $availabilityWhere: JSONObject, $teamsWhere: JSONObject) {
              clubs(where: $where) {
                rows {
                  id
                  name
                  locations {
                    id
                    name
                    availibilities(where: $availabilityWhere) {
                      id
                      days {
                        day
                        endTime
                        startTime
                        courts
                      }
                      exceptions {
                        courts
                        end
                        start
                      }
                    }
                  }
                  teams(where: $teamsWhere) {
                    id
                    name
                    entry {
                      id
                      meta {
                        competition {
                          teamIndex
                          players {
                            id
                            single
                            double
                            mix
                            player {
                              fullName
                            }
                          }
                        }
                      }
                      subEventCompetition {
                        id
                        name
                        eventType
                      }
                    }
                  }
                }
              }
            }
          `,
          variables: {
            where: clubWhere,
            availabilityWhere: {
              year: this.yearControl.value,
            },
            teamsWhere: {
              year: this.eventControl.value
            }
          },
        });
      }),

      map((result) =>
        result.data.clubs?.rows.map(
          (node) => new Club(node) as Club & { hasLocation: boolean }
        )
      ),
      map((clubs) => {
        // Sort by name
        clubs = clubs.sort((a, b) =>
          (a.name ?? '').localeCompare(b.name ?? '')
        );

        clubs = clubs.map?.((club) => {
          club.hasLocation =
            club?.locations?.some(
              (location) =>
                location?.availibilities?.[0]?.days?.length ?? 0 <= 0
            ) ?? false;

          club.teams = club.teams?.filter((team) => {
            return (team.entry?.meta?.competition?.teamIndex ?? 0) > 0;
          });
          return club;
        });

        return clubs.filter((club) => {
          return (club.teams ?? []).length > 0;
        });
      }),
      tap(() => (this.loading = false))
    );

    this.events$ = this.yearControl.valueChanges.pipe(
      startWith(this.yearControl.value),
      switchMap((year) =>
        this._apollo.query<{
          eventCompetitions: {
            rows: Partial<EventCompetition>[];
          };
        }>({
          query: gql`
            query CompetitionEvents($where: JSONObject) {
              eventCompetitions(where: $where) {
                rows {
                  id
                  name
                  subEventCompetitions {
                    id
                  }
                }
              }
            }
          `,
          variables: {
            where: {
              season: year,
              openDate: { $lte: new Date().toISOString() },
              closeDate: { $gte: new Date().toISOString() },
            },
          },
        })
      ),
      map((result) =>
        result.data.eventCompetitions.rows.map(
          (node) => new EventCompetition(node)
        )
      )
    );
  }
}
