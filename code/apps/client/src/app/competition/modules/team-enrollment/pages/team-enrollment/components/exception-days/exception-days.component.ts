import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import moment, { Moment } from 'moment';
import {
  AvailabilityException,
  resetAllFormFields,
} from '../../../../../../../_shared';
import { STEP_AVAILIBILTY } from '../../team-enrollment.component';

@Component({
  selector: 'badman-exception-days',
  templateUrl: './exception-days.component.html',
  styleUrls: ['./exception-days.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExceptionDaysComponent implements OnInit {
  fg!: FormGroup;

  @Input()
  exception?: AvailabilityException | null;

  @Output()
  exeptionChanged = new EventEmitter<AvailabilityException>();

  @Output()
  exeptionDeleted = new EventEmitter();

  isNew = false;

  constructor(@Inject(MatStepper) private _stepper: MatStepper) {
    if (!_stepper) {
      throw new Error('Stepper is not provided');
    }
  }

  ngOnInit(): void {
    if (!this.exception) {
      this.isNew = true;
    }

    const startControl = new FormControl<Moment | null>(null);
    const endControl = new FormControl<Moment | null>(null);

    if (this.exception) {
      startControl.setValue(moment(this.exception?.start));
      endControl.setValue(moment(this.exception?.end));
    }

    this.fg = new FormGroup({
      courts: new FormControl(this.exception?.courts),
      start: startControl,
      end: endControl,
    });

    if (this.isNew) {
      this._stepper.selectionChange.subscribe((r) => {
        if (r.previouslySelectedIndex == STEP_AVAILIBILTY) {
          this.addException();
        }
      });
    } else {
      this.fg.valueChanges.subscribe(() => {
        this.exeptionChanged.next(new AvailabilityException(this.fg.value));
      });
    }
  }

  addException() {
    // Validate all fields (we can't use the FG valiate because this also checks on submit)
    if (
      !this.fg.value?.courts ||
      !this.fg.value?.start ||
      !this.fg.value?.end
    ) {
      return;
    }

    this.exeptionChanged.next(new AvailabilityException(this.fg.value));
    resetAllFormFields(this.fg);
  }

  deleteException() {
    this.exeptionDeleted.next(null);
  }
}
