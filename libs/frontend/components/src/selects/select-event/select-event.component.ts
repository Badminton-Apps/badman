import { CommonModule } from '@angular/common';
import { Component, OnInit, input, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { EventCompetition } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { Observable } from 'rxjs';
import { map, takeUntil, tap } from 'rxjs/operators';

@Component({
    selector: 'badman-select-event',
    templateUrl: './select-event.component.html',
    styleUrls: ['./select-event.component.scss'],
    imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatSelectModule]
})
export class SelectEventComponent implements OnInit {
  private apollo = inject(Apollo);
  private destroy$ = injectDestroy();

  controlName = input('event');

  formGroup = input<FormGroup | undefined>();

  where = input<{
    [key: string]: unknown;
  }>({});

  initialId = input<string | undefined>();

  control = input(new FormControl<EventCompetition | null>(null, [Validators.required]));

  events$!: Observable<EventCompetition[]>;

  ngOnInit() {
    if (this.formGroup()) {
      if (!this.formGroup()?.get(this.controlName())) {
        this.formGroup()?.addControl(this.controlName(), this.control());
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
          where: this.where(),
        },
      })
      .pipe(
        takeUntil(this.destroy$),
        map(({ data }) => data.eventCompetitions.rows?.map((e) => new EventCompetition(e))),
        tap((events) => {
          if (this.initialId()) {
            const initialEvent = events.find((e) => e.id === this.initialId());
            if (initialEvent) {
              this.control().setValue(initialEvent);
            }
          }
        }),
      );
  }
}
