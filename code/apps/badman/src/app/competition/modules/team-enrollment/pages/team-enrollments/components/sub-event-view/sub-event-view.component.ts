import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Apollo, gql } from 'apollo-angular';
import { map, Observable, startWith, switchMap } from 'rxjs';
import {
  EventCompetition,
  CompetitionSubEvent,
  sortSubEvents,
} from '../../../../../../../_shared';

@Component({
  selector: 'badman-sub-event-view',
  templateUrl: './sub-event-view.component.html',
  styleUrls: ['./sub-event-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubEventViewComponent implements OnInit {
  overlayOpen = '';

  yearControl: FormControl = new FormControl(2022);
  eventControl: FormControl = new FormControl();

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
                    team {
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
        event.subEvents = event.subEvents ?? [];

        // Sort by level
        event.subEvents = event.subEvents.sort(sortSubEvents);

        // Filter entries
        event.subEvents = event.subEvents.map((subEvent) => {
          subEvent.entries = subEvent.entries?.filter(
            (entry) => entry.meta !== null
          );
          return subEvent;
        });

        return event.subEvents;
      })
    );

    this.events$ = this.yearControl.valueChanges.pipe(
      startWith(this.yearControl.value),
      switchMap((year) =>
        this._apollo.query<{
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
              startYear: year,
              allowEnlisting: true,
            },
          },
        })
      ),
      map((result) =>
        result.data.competitionEvents.edges.map(
          ({ node }) => new EventCompetition(node)
        )
      )
    );
  }
}
