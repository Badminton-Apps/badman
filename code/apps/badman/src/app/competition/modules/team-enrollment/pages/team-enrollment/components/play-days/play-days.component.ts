import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AvailabilityDay, resetAllFormFields, validateAllFormFields } from '../../../../../../../_shared';
import * as moment from 'moment';

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
  onChange = new EventEmitter<AvailabilityDay>();

  @Output()
  onDelete = new EventEmitter();

  isNew = false;

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
  }

  addPlayDay() {
    if (!this.fg.valid) {
      validateAllFormFields(this.fg);
      return;
    }

    this.onChange.next(new AvailabilityDay(this.fg.value));
    resetAllFormFields(this.fg);
  }

  deletePlayDay() {
    this.onDelete.next(null);
  }
}
