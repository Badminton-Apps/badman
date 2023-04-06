import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { EventCompetition } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { Subject, Observable } from 'rxjs';
import { map, takeUntil, tap } from 'rxjs/operators';

@Component({
  selector: 'badman-select-event',
  templateUrl: './select-event.component.html',
  styleUrls: ['./select-event.component.scss'],
  standalone: true,
  imports: [
    CommonModule,

    // Material
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
})
export class SelectEventComponent implements OnInit, OnDestroy {
  destroy$ = new Subject<void>();

  @Input()
  controlName = 'event';

  @Input()
  formGroup!: FormGroup;

  @Input()
  where: { [key: string]: unknown } = {};

  @Input()
  initialId?: string;

  @Input()
  control = new FormControl<EventCompetition | null>(null, [
    Validators.required,
  ]);

  events$!: Observable<EventCompetition[]>;

  constructor(private apollo: Apollo) {}

  ngOnInit() {
    if (this.formGroup) {
      if (!this.formGroup.get(this.controlName)) {
        this.formGroup.addControl(this.controlName, this.control);
      }
    }

    this.events$ = this.apollo
      .query<{
        eventCompetitions: {
          count: number;
          rows: Partial<EventCompetition>[];
        };
      }>({
        query: gql`
          query GetEventsOpenForEnlisting($where: JSONObject) {
            eventCompetitions(where: $where) {
              rows {
                id
                name
                type
              }
            }
          }
        `,
        variables: {
          where: this.where,
        },
      })
      .pipe(
        takeUntil(this.destroy$),
        map(({ data }) =>
          data.eventCompetitions.rows?.map((e) => new EventCompetition(e))
        ),
        tap((events) => {
          console.log('initialEvent', this.initialId);
          if (this.initialId) {
            const initialEvent = events.find((e) => e.id === this.initialId);
            if (initialEvent) {
              this.control.setValue(initialEvent);
            }
          }
        })
      );
  }

  ngOnDestroy() {
    if (this.formGroup) {
      this.formGroup.removeControl(this.controlName);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }
}
