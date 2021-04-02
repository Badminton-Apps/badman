import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  OnInit,
  Input,
  Output,
} from '@angular/core';
import { FormGroup, Validators, FormControl } from '@angular/forms';
import { CompetitionEvent, Event } from 'app/_shared';
import { debounce, debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-event-competition-fields',
  templateUrl: './event-competition-fields.component.html',
  styleUrls: ['./event-competition-fields.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventCompetitionFieldsComponent {
  @Input()
  event: CompetitionEvent = {} as CompetitionEvent;

  @Input()
  formGroup: FormGroup;
}
