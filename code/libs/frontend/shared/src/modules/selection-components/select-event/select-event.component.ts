import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EventCompetition } from '@badman/frontend/models';

@Component({
  selector: 'badman-select-event',
  templateUrl: './select-event.component.html',
  styleUrls: ['./select-event.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectEventComponent implements OnInit, OnDestroy {
  @Input()
  controlName = 'event';

  @Input()
  formGroup!: FormGroup;

  formControl = new FormControl(null, [Validators.required]);

  events$!: Observable<EventCompetition[]>;

  constructor(private apollo: Apollo) {}

  ngOnInit() {
    this.formGroup.addControl(this.controlName, this.formControl);

    this.events$ = this.apollo
      .query<{
        eventCompetitions: {
          count: number;
          rows: Partial<EventCompetition>[];
        };
      }>({
        query: gql`
          query GetEventsOpenForEnlisting {
            eventCompetitions(where: { allowEnlisting: true, type: "PROV" }) {
              rows {
                id
                name
              }
            }
          }
        `,
      })
      .pipe(
        map(({ data }) =>
          data.eventCompetitions.rows?.map((e) => new EventCompetition(e))
        )
      );
  }

  ngOnDestroy() {
    this.formGroup.removeControl(this.controlName);
  }
}
