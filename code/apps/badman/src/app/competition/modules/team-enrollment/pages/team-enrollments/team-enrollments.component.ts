import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Apollo, gql } from 'apollo-angular';
import { Club, EventCompetition, CompetitionSubEvent, sortSubEvents } from '../../../../../_shared';
import { map, Observable,  switchMap, tap } from 'rxjs';

@Component({
  templateUrl: './team-enrollments.component.html',
  styleUrls: ['./team-enrollments.component.scss'],
})
export class TeamEnrollmentsComponent implements OnInit {
  eventControl: FormControl = new FormControl();
  yearControl: FormControl = new FormControl();

  clubs$!: Observable<Club[]>;
  entries$!: Observable<CompetitionSubEvent[]>;
  events$!: Observable<EventCompetition[]>;

  constructor(private _apollo: Apollo) {}

  ngOnInit(): void {
    this.entries$ = this.eventControl.valueChanges.pipe(
      switchMap((eventId) =>
        this._apollo.query<{ competitionEvent: EventCompetition }>({
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
      map((result) => new EventCompetition(result.data.competitionEvent)),
      map((event) => {
        event.subEventCompetitions = event.subEventCompetitions ?? [];

        // Sort by level
        event.subEventCompetitions = event.subEventCompetitions.sort(sortSubEvents);

        // Filter entries
        event.subEventCompetitions = event.subEventCompetitions.map((subEvent) => {
          subEvent.entries = subEvent.entries?.filter((entry) => entry.meta !== null);
          return subEvent;
        });

        return event.subEventCompetitions;
      }),
      tap((e) => console.log(e))
    );

    this.events$ = this._apollo
      .query<{
        competitionEvents: {
          edges: {
            node: Partial<EventCompetition>;
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
      .pipe(map((result) => result.data.competitionEvents.edges.map(({ node }) => new EventCompetition(node))));
  }
}
