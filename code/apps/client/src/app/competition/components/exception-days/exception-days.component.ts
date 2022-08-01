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
import moment, { Moment } from 'moment';
import { AvailabilityException, resetAllFormFields } from '../../../_shared';

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

  @Input()
  whenChangedFocus?: EventEmitter<void>;

  @Output()
  exeptionChanged = new EventEmitter<AvailabilityException>();

  @Output()
  exeptionDeleted = new EventEmitter();

  isNew = false;

  constructor(private _snackbar: MatSnackBar) {}

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
      this.whenChangedFocus?.subscribe(() => {
        this.addException(false);
      });
    } else {
      this.fg.valueChanges.subscribe(() => {
        this.exeptionChanged.next(new AvailabilityException(this.fg.value));
      });
    }
  }

  addException(showNotification: boolean = true) {
    // Validate all fields (we can't use the FG valiate because this also checks on submit)
    if (
      (this.fg.value?.courts ?? -1) < 0 ||
      !this.fg.value?.start ||
      !this.fg.value?.end
    ) {
      if (showNotification) {
        this._snackbar.open('Please fill in all fields', 'OK', {
          duration: 2000,
        });
      }
      return;
    }

    this.exeptionChanged.next(new AvailabilityException(this.fg.value));
    resetAllFormFields(this.fg);
  }

  deleteException() {
    this.exeptionDeleted.next(null);
  }
}
