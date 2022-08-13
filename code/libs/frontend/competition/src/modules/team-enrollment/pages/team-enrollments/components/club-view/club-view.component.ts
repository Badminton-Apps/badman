import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Apollo, gql } from 'apollo-angular';
import { Club, EventCompetition } from '@badman/frontend/shared';
import { map, Observable, startWith, switchMap, tap } from 'rxjs';

@Component({
  selector: 'badman-club-view',
  templateUrl: './club-view.component.html',
  styleUrls: ['./club-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    this.clubs$ = this.eventControl.valueChanges.pipe(
      tap(() => (this.loading = true)),

      switchMap((eventId) => {
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
          subEventIds: [
            ...new Set(
              result.data.eventCompetition.subEventCompetitions
                ?.map((s) => s.id)
                ?.flat()
            ),
          ],
          clubIds: [
            ...new Set(
              result.data.eventCompetition.subEventCompetitions
                ?.map((s) => s.eventEntries?.map((e) => e.team?.clubId))
                ?.flat()
            ),
          ],
        };
      }),
      // Distinct
      switchMap(({ subEventIds, clubIds }) => {
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
            query Clubs(
              $where: JSONObject
              $teamWhere: JSONObject
              $availabilityWhere: JSONObject
            ) {
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
                  teams(where: { active: true }) {
                    id
                    name
                    entries(where: $teamWhere) {
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
                      competitionSubEvent {
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
            teamWhere: {
              subEventId: subEventIds,
            },
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
            if ((team.entries?.length ?? 0) == 0) {
              return false;
            }

            if (
              !team?.entries?.some(
                (r) => (r.meta?.competition?.teamIndex ?? 0) > 0
              )
            ) {
              return false;
            }
            return true;
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
              startYear: year,
              allowEnlisting: true,
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
