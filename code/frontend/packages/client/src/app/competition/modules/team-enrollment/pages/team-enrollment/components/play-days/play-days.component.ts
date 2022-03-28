import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { AvailabilityDay } from 'app/_shared';
import * as moment from 'moment';

@Component({
  selector: 'app-play-days',
  templateUrl: './play-days.component.html',
  styleUrls: ['./play-days.component.scss'],
})
export class PlayDaysComponent implements OnInit {
  fg!: FormGroup;

  @Input()
  availabilityDay?: AvailabilityDay;

  @Output()
  onAdd = new EventEmitter<AvailabilityDay>();

  @Output()
  onChange = new EventEmitter<AvailabilityDay>();

  @Input()
  newDay = false;

  ngOnInit(): void {
    const startControl = new FormControl();
    const endControl = new FormControl();
    if (this.availabilityDay) {
      startControl.setValue(moment(this.availabilityDay?.startTime, 'HH:mm'));
      endControl.setValue(moment(this.availabilityDay?.endTime, 'HH:mm'));
    } else {
      startControl.setValue(moment('19:00', 'HH:mm'));
      endControl.setValue(moment('21:00', 'HH:mm'));
    }

    this.fg = new FormGroup({
      day: new FormControl(this.availabilityDay?.day ?? 'saturday'),
      start: startControl,
      end: endControl,
      courts: new FormControl(this.availabilityDay?.courts ?? 0),
    });
  }

  submit() {
    const start = this.fg.get('start')!.value!;
    const startTime = `${start.getHours()}:${start.getMinutes()}`;

    const end = this.fg.get('end')!.value!;
    const endTime = `${end.getHours()}:${end.getMinutes()}`;

    if (this.newDay) {
      this.onAdd.next({
        day: 'monday',
        startTime,
        endTime,
        courts: 0,
      });
    } else {
      this.onChange.next(this.fg.value);
    }
  }
}
