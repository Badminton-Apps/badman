import { Component, EventEmitter, Inject, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepper } from '@angular/material/stepper';
import { AvailabilityDay, resetAllFormFields, validateAllFormFields } from 'app/_shared';
import * as moment from 'moment';
import { STEP_AVAILIBILTY } from '../../team-enrollment.component';

@Component({
  selector: 'app-play-days',
  templateUrl: './play-days.component.html',
  styleUrls: ['./play-days.component.scss'],
})
export class PlayDaysComponent implements OnInit {
  fg!: FormGroup;

  @Input()
  day?: AvailabilityDay | null;

  @Output()
  onChange = new EventEmitter<AvailabilityDay>();

  @Output()
  onDelete = new EventEmitter();

  isNew = false;

  constructor(@Inject(MatStepper) private _stepper: MatStepper, private _snackBar: MatSnackBar) {
    if (!_stepper) {
      throw new Error('Stepper is not provided');
    }
  }

  ngOnInit(): void {
    if (!this.day) {
      this.isNew = true;
    }

    this.fg = new FormGroup({
      day: new FormControl(this.day?.day, [Validators.required]),
      courts: new FormControl(this.day?.courts, [Validators.required]),
      startTime: new FormControl(moment(this.day?.startTime ?? '19:00', 'HH:mm').format('HH:mm'), [
        Validators.required,
      ]),
      endTime: new FormControl(moment(this.day?.endTime ?? '21:00', 'HH:mm').format('HH:mm'), [Validators.required]),
    });

    // Add entered data when leaving this step
    if (this.isNew) {
      this._stepper.selectionChange.subscribe((r) => {
        if (r.previouslySelectedIndex == STEP_AVAILIBILTY) {
          this.addPlayDay();
        }
      });
    } else {
      this.fg.valueChanges.subscribe(() => {
        this.onChange.next(new AvailabilityDay(this.fg.value));
      });
    }
  }

  addPlayDay() {
    if (!this.fg.valid) {
      validateAllFormFields(this.fg);
      return;
    }

    this.onChange.next(new AvailabilityDay(this.fg.value));
    this.fg = new FormGroup({
      day: new FormControl(this.day?.day, [Validators.required]),
      courts: new FormControl(this.day?.courts, [Validators.required]),
      startTime: new FormControl(moment(this.day?.startTime ?? '19:00', 'HH:mm').format('HH:mm'), [
        Validators.required,
      ]),
      endTime: new FormControl(moment(this.day?.endTime ?? '21:00', 'HH:mm').format('HH:mm'), [Validators.required]),
    });
  }

  deletePlayDay() {
    this.onDelete.next(null);
  }
}
