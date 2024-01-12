import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Apollo, gql } from 'apollo-angular';
import { map, Observable, startWith, switchMap } from 'rxjs';
import { EventCompetition, SubEventCompetition } from '@badman/frontend-models';
import { sortSubEvents } from '@badman/utils';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCardModule } from '@angular/material/card';
import { OverlayModule } from '@angular/cdk/overlay';

@Component({
  selector: 'badman-sub-event-view',
  templateUrl: './sub-event-view.component.html',
  styleUrls: ['./sub-event-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatOptionModule,
    MatSelectModule,
    MatExpansionModule,
    MatCardModule,
    OverlayModule
],
})
export class SubEventViewComponent implements OnInit {
  overlayOpen = '';

  yearControl: FormControl = new FormControl(2022);
  eventControl: FormControl = new FormControl();

  subEvents$!: Observable<SubEventCompetition[]>;
  events$!: Observable<EventCompetition[]>;

  constructor(private _apollo: Apollo) {}

  ngOnInit(): void {
    this.subEvents$ = this.eventControl.valueChanges.pipe(
      switchMap((eventId) =>
        this._apollo.query<{ eventCompetition: EventCompetition }>({
          query: gql`
            query CompetitionEvent($competitionEventId: ID!) {
              eventCompetition(id: $competitionEventId) {
                id
                subEventCompetitions {
                  id
                  name
                  level
                  eventType
                  eventEntries {
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
      map((result) => new EventCompetition(result.data.eventCompetition)),
      map((event) => {
        event.subEventCompetitions = event.subEventCompetitions ?? [];

        // Sort by level
        event.subEventCompetitions =
          event.subEventCompetitions.sort(sortSubEvents);

        // Filter entries
        event.subEventCompetitions = event.subEventCompetitions.map(
          (subEvent) => {
            subEvent.eventEntries = subEvent.eventEntries?.filter(
              (entry) => entry.meta !== null
            );
            return subEvent;
          }
        );

        return event.subEventCompetitions;
      })
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
