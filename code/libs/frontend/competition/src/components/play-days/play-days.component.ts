import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import moment from 'moment';
import { AvailabilityDay } from '@badman/frontend/shared';

@Component({
  selector: 'badman-play-days',
  templateUrl: './play-days.component.html',
  styleUrls: ['./play-days.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayDaysComponent implements OnInit {
  fg!: FormGroup;

  @Input()
  day?: AvailabilityDay | null;

  @Input()
  whenChangedFocus?: EventEmitter<void>;

  @Output()
  playDayChanged = new EventEmitter<AvailabilityDay>();

  @Output()
  playDayDeleted = new EventEmitter();

  isNew = false;

  constructor(private _snackbar: MatSnackBar) {}

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

    if (this.isNew) {
      this.whenChangedFocus?.subscribe(() => {
        this.addPlayDay(false);
      });
    } else {
      this.fg.valueChanges.subscribe(() => {
        this.playDayChanged.next(new AvailabilityDay(this.fg.value));
      });
    }
  }

  addPlayDay(showNotification: boolean = true) {
    // Validate all fields (we can't use the FG valiate because this also checks on submit)
    if (
      (this.fg.value?.courts ?? -1) < 0 ||
      !this.fg.value?.day ||
      !this.fg.value?.startTime ||
      !this.fg.value?.endTime
    ) {
      if (showNotification) {
        this._snackbar.open('Please fill in all fields', 'OK', {
          duration: 2000,
        });
      }
      return;
    }
    const newDay = new AvailabilityDay({ ...this.fg.value });
    this.playDayChanged.next(newDay);

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
