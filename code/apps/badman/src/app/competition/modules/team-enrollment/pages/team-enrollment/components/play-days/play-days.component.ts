import { Component, EventEmitter, Inject, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import * as moment from 'moment';
import { AvailabilityDay } from '../../../../../../../_shared';
import { STEP_AVAILIBILTY } from '../../team-enrollment.component';

@Component({
  selector: 'badman-play-days',
  templateUrl: './play-days.component.html',
  styleUrls: ['./play-days.component.scss'],
})
export class PlayDaysComponent implements OnInit {
  fg!: FormGroup;

  @Input()
  day?: AvailabilityDay | null;

  @Output()
  playDayChanged = new EventEmitter<AvailabilityDay>();

  @Output()
  playDayDeleted = new EventEmitter();

  isNew = false;

  constructor(
    @Inject(MatStepper) private _stepper: MatStepper,
  ) {
    if (!_stepper) {
      throw new Error('Stepper is not provided');
    }
  }

  ngOnInit(): void {
    if (!this.day) {
      this.isNew = true;
    }

    this.fg = new FormGroup({
      day: new FormControl(this.day?.day),
      courts: new FormControl(this.day?.courts),
      startTime: new FormControl(
        moment(this.day?.startTime ?? '19:00', 'HH:mm').format('HH:mm')
      ),
      endTime: new FormControl(
        moment(this.day?.endTime ?? '21:00', 'HH:mm').format('HH:mm')
      ),
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
        this.playDayChanged.next(new AvailabilityDay(this.fg.value));
      });
    }
  }

  addPlayDay() {
    // Validate all fields (we can't use the FG valiate because this also checks on submit)
    if (
      !this.fg.value?.day ||
      !this.fg.value?.courts ||
      !this.fg.value?.startTime ||
      !this.fg.value?.endTime
    ) {
      return;
    }

    this.playDayChanged.next(new AvailabilityDay(this.fg.value));
    this.fg = new FormGroup({
      day: new FormControl(this.day?.day),
      courts: new FormControl(this.day?.courts),
      startTime: new FormControl(
        moment(this.day?.startTime ?? '19:00', 'HH:mm').format('HH:mm')
      ),
      endTime: new FormControl(
        moment(this.day?.endTime ?? '21:00', 'HH:mm').format('HH:mm')
      ),
    });
  }

  deletePlayDay() {
    this.playDayDeleted.next(null);
  }
}
