import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Apollo, gql } from 'apollo-angular';
import { Club, CompetitionEvent, CompetitionSubEvent, sortSubEvents } from 'app/_shared';
import { map, Observable, startWith, switchMap, tap } from 'rxjs';

@Component({
  templateUrl: './team-enrollments.component.html',
  styleUrls: ['./team-enrollments.component.scss'],
})
export class TeamEnrollmentsComponent implements OnInit {
  eventControl: FormControl = new FormControl();
  yearControl: FormControl = new FormControl();

  clubs$!: Observable<Club[]>;
  entries$!: Observable<CompetitionSubEvent[]>;
  events$!: Observable<CompetitionEvent[]>;

  constructor(private _apollo: Apollo) {}

  ngOnInit(): void {
    this.entries$ = this.eventControl.valueChanges.pipe(
      switchMap((eventId) =>
        this._apollo.query<{ competitionEvent: CompetitionEvent }>({
          query: gql`
            query CompetitionEvent($competitionEventId: ID!) {
              competitionEvent(id: $competitionEventId) {
                id
                subEvents {
                  id
                  name
                  level
                  eventType
                  entries {
                    id
                    meta {
                      competition {
                        players {
                          mix
                          single
                          double
                          player {
                            fullName
                          }
                        }
                        teamIndex
                      }
                    }
                    team(where: {active: true}) {
                      id
                      name
                      clubId
                    }
                  }
                }
              }
            }
          `,
          variables: {
            competitionEventId: eventId,
          },
        })
      ),
      map((result) => new CompetitionEvent(result.data.competitionEvent)),
      map((event) => {
        event.subEvents = event.subEvents ?? [];

        // Sort by level
        event.subEvents = event.subEvents.sort(sortSubEvents);

        // Filter entries
        event.subEvents = event.subEvents.map((subEvent) => {
          subEvent.entries = subEvent.entries?.filter((entry) => entry.meta !== null);
          return subEvent;
        });

        return event.subEvents;
      }),
      tap((e) => console.log(e))
    );

    this.events$ = this._apollo
      .query<{
        competitionEvents: {
          edges: {
            node: Partial<CompetitionEvent>;
          }[];
        };
      }>({
        query: gql`
          query CompetitionEvents($where: SequelizeJSON) {
            competitionEvents(where: $where) {
              edges {
                node {
                  id
                  name
                }
              }
            }
          }
        `,
        variables: {
          where: {
            startYear: 2022,
            allowEnlisting: true,
          },
        },
      })
      .pipe(map((result) => result.data.competitionEvents.edges.map(({ node }) => new CompetitionEvent(node))));
  }
}
