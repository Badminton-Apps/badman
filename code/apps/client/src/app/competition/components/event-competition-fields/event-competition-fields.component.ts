import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { EventCompetition } from '../../../_shared';

@Component({
  selector: 'badman-event-competition-fields',
  templateUrl: './event-competition-fields.component.html',
  styleUrls: ['./event-competition-fields.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventCompetitionFieldsComponent {
  @Input()
  event: EventCompetition = {} as EventCompetition;

  @Input()
  formGroup!: FormGroup;
}
