import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { EventCompetition, SubEventCompetition } from '@badman/frontend-models';
import { SubEventType } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { BehaviorSubject } from 'rxjs';
import { map, takeUntil, tap } from 'rxjs/operators';

export interface PickEventDialogData {
  season: number;
  type: SubEventType;
  eventId?: string;
  subEventId?: string;
}

@Component({
  selector: 'badman-pick-event-dialog',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatProgressBarModule,
    MatSelectModule,
    MatButtonModule,
  ],
  templateUrl: './pick-event-dialog.component.html',
  styleUrls: ['./pick-event-dialog.component.scss'],
})
export class PickEventDialogComponent implements OnInit {
  private destroy$ = injectDestroy();

  selectForm = new FormGroup({
    event: new FormControl<string>(''),
    subEvent: new FormControl<string>(''),
  });

  #events = new BehaviorSubject<EventCompetition[]>([]);
  get events() {
    return this.#events.value;
  }

  #subEvents = new BehaviorSubject<SubEventCompetition[]>([]);
  get subEvents() {
    return this.#subEvents.value;
  }

  constructor(
    private readonly appollo: Apollo,
    private readonly _dialogRef: MatDialogRef<PickEventDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: PickEventDialogData,
  ) {}

  ngOnInit(): void {
    this._loadEvents().pipe(takeUntil(this.destroy$)).subscribe();
    this.selectForm.controls.event.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((eventId) => {
        if (!eventId) {
          this.#subEvents.next([]);
          return;
        }

        return this.onEventSelected(eventId);
      });

    if (this.data.eventId) {
      this.selectForm.controls.event.setValue(this.data.eventId);
    }
  }

  onEventSelected(evenId: string) {
    this._loadSubEvents(evenId).pipe(takeUntil(this.destroy$)).subscribe();

    if (this.data.subEventId) {
      this.selectForm.controls.subEvent.setValue(this.data.subEventId);
    }
  }

  private _loadEvents() {
    return this.appollo
      .query<{
        eventCompetitions: {
          count: number;
          rows: EventCompetition[];
        };
      }>({
        query: gql`
          query EventCompetitions($where: JSONObject) {
            eventCompetitions(where: $where) {
              count
              rows {
                id
                name
                season
              }
            }
          }
        `,
        variables: {
          where: {
            season: this.data.season,
            official: true,
          },
        },
      })
      .pipe(
        map(
          (result) =>
            result.data.eventCompetitions.rows?.map((row) => new EventCompetition(row)) ?? [],
        ),
        tap((events) => this.#events.next(events)),
      );
  }

  private _loadSubEvents(eventId: string) {
    return this.appollo
      .query<{
        subEventCompetitions: SubEventCompetition[];
      }>({
        query: gql`
          query SubEventCompetitions($where: JSONObject) {
            subEventCompetitions(where: $where) {
              id
              name
              eventType
            }
          }
        `,
        variables: {
          where: {
            eventId: eventId,
            type: this.data.type,
          },
        },
      })
      .pipe(
        map(
          (result) =>
            result.data.subEventCompetitions?.map((row) => new SubEventCompetition(row)) ?? [],
        ),
        tap((subEvents) => this.#subEvents.next(subEvents)),
      );
  }
}
