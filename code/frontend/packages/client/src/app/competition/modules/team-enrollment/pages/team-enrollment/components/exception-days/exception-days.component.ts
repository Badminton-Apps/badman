import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  EventEmitter,
  Input,
  Output,
  Inject,
  OnDestroy,
} from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { AvailabilityException, resetAllFormFields, validateAllFormFields } from 'app/_shared';
import * as moment from 'moment';
import { STEP_AVAILIBILTY } from '../../team-enrollment.component';

@Component({
  selector: 'app-exception-days',
  templateUrl: './exception-days.component.html',
  styleUrls: ['./exception-days.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExceptionDaysComponent implements OnInit {
  fg!: FormGroup;

  @Input()
  exception?: AvailabilityException | null;

  @Output()
  onChange = new EventEmitter<AvailabilityException>();

  @Output()
  onDelete = new EventEmitter();

  isNew = false;

  constructor(@Inject(MatStepper) private stepper: MatStepper) {
    if (!stepper) {
      throw new Error('Stepper is not provided');
    }
  }

  ngOnInit(): void {
    if (!this.exception) {
      this.isNew = true;
    }

    const startControl = new FormControl(null, [Validators.required]);
    const endControl = new FormControl(null, [Validators.required]);

    if (this.exception) {
      startControl.setValue(moment(this.exception?.start));
      endControl.setValue(moment(this.exception?.end));
    }

    this.fg = new FormGroup({
      courts: new FormControl(this.exception?.courts, [Validators.required]),
      start: startControl,
      end: endControl,
    });

    // Add entered data when leaving this step
    if (this.isNew) {
      this.stepper.selectionChange.subscribe((r) => {
        if (r.previouslySelectedIndex == STEP_AVAILIBILTY) {
          this.addException();
        }
      });
    } else {
      this.fg.valueChanges.subscribe(() => {
        this.onChange.next(new AvailabilityException(this.fg.value));
      });
    }
  }

  addException() {
    if (!this.fg.valid) {
      validateAllFormFields(this.fg);
      return;
    }

    this.onChange.next(new AvailabilityException(this.fg.value));
    resetAllFormFields(this.fg);
  }

  deleteException() {
    this.onDelete.next(null);
  }
}
