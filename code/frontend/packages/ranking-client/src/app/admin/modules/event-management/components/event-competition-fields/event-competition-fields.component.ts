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
export class EventCompetitionFieldsComponent implements OnInit {
  @Input()
  event: CompetitionEvent = {} as CompetitionEvent;

  @Input()
  formGroup: FormGroup;

  ngOnInit() {
    const nameControl = new FormControl(this.event.name, Validators.required);
    const yearControl = new FormControl(this.event.startYear, [
      Validators.required,
      Validators.min(2000),
      Validators.max(3000),
    ]);

    this.formGroup.addControl('name', nameControl);
    this.formGroup.addControl('startYear', yearControl);
  }
}
