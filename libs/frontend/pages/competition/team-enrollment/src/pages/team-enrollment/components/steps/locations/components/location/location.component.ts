import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { getCurrentSeason } from '@badman/utils';

import { TranslateModule } from '@ngx-translate/core';
import { MomentModule } from 'ngx-moment';
import { Subject, takeUntil } from 'rxjs';

export type LocationavDayType = FormGroup<{
  day: FormControl<string | undefined>;
  startTime: FormControl<string | undefined>;
  endTime: FormControl<string | undefined>;
  courts: FormControl<number | undefined>;
}>;
export type LocationExceptionType = FormGroup<{
  start: FormControl<Date | undefined>;
  end: FormControl<Date | undefined>;
  courts: FormControl<number | undefined>;
}>;

export type LocationAvailibilityForm = FormGroup<{
  id: FormControl<string | undefined>;
  year: FormControl<number>;
  days: FormArray<LocationavDayType>;
  exceptions: FormArray<LocationExceptionType>;
}>;

export type LocationForm = FormGroup<{
  id: FormControl<string | undefined>;
  name: FormControl<string | undefined>;
  address: FormControl<string | undefined>;
  street: FormControl<string | undefined>;
  streetNumber: FormControl<string | undefined>;
  postalcode: FormControl<string | undefined>;
  city: FormControl<string | undefined>;
  state: FormControl<string | undefined>;
  phone: FormControl<string | undefined>;
  fax: FormControl<string | undefined>;
  availibilities: FormArray<LocationAvailibilityForm>;
}>;

@Component({
  selector: 'badman-location',
  standalone: true,
  imports: [
    CommonModule,

    TranslateModule,
    ReactiveFormsModule,
    FormsModule,
    MomentModule,

    // Material
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatDividerModule,
    MatTooltipModule,
    MatDatepickerModule,
  ],
  templateUrl: './location.component.html',
  styleUrls: ['./location.component.scss'],
})
export class LocationComponent implements OnInit {
  destroy$ = new Subject<void>();

  @Input()
  group!: LocationForm;

  @Input()
  control?: LocationAvailibilityForm;

  @Input()
  controlName = 'availibilities';

  @Output()
  whenLocationUpdate = new EventEmitter<void>();

  days!: FormArray<LocationavDayType>;
  exceptions!: FormArray<LocationExceptionType>;

  showCourts: {
    manualOpen: boolean;
    autoOpen: boolean;
  }[] = [];

  expanded = {
    start: undefined,
    end: undefined,
    days: true,
    exceptions: false,
  };

  isSmallScreen = false;

  constructor(private breakpointObserver: BreakpointObserver) {}

  ngOnInit(): void {
    this.breakpointObserver
      .observe([
        Breakpoints.XSmall,
        Breakpoints.Small,
        Breakpoints.Medium,
        Breakpoints.Large,
        Breakpoints.XLarge,
      ])
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        for (const query of Object.keys(result.breakpoints)) {
          if (result.breakpoints[query]) {
            this.isSmallScreen =
              query === Breakpoints.Small || query === Breakpoints.XSmall;
            break;
          }
        }
      });

    let created = false;
    if (this.group) {
      const localControl = this.group.get(
        this.controlName
      ) as FormArray<LocationAvailibilityForm>;
      // there should be one created by default
      this.control = localControl.controls.at(0) as LocationAvailibilityForm;
    }

    if (!this.control) {
      created = true;
      this.control = new FormGroup({
        id: new FormControl(),
        year: new FormControl(getCurrentSeason()),
        days: new FormArray([] as LocationavDayType[]),
        exceptions: new FormArray([] as LocationExceptionType[]),
      }) as unknown as LocationAvailibilityForm;
    }

    if (this.group && created) {
      (
        this.group.get(this.controlName) as FormArray<LocationAvailibilityForm>
      ).push(this.control);
    }

    this.exceptions = this.control.get(
      'exceptions'
    ) as FormArray<LocationExceptionType>;

    if (this.exceptions.length !== 0) {
      this.expanded.exceptions = true;
    }

    this.days = this.control.get('days') as FormArray<LocationavDayType>;

    this.showCourts = this.exceptions.value.map((v) => {
      return {
        manualOpen: false,
        autoOpen: v.courts != 0,
      };
    });
  }

  addAvailibility() {
    this.days.push(
      new FormGroup({
        day: new FormControl(),
        startTime: new FormControl(),
        endTime: new FormControl(),
        courts: new FormControl(),
      }) as LocationavDayType
    );
    this.expanded.days = true;
  }

  removeAvailibility(index: number) {
    this.days.removeAt(index);
  }

  addException() {
    this.exceptions.push(
      new FormGroup({
        start: new FormControl(),
        end: new FormControl(),
        courts: new FormControl(0),
      }) as LocationExceptionType
    );
    this.showCourts.push({
      manualOpen: false,
      autoOpen: false,
    });

    this.expanded.exceptions = true;
  }

  removeException(index: number) {
    this.exceptions.removeAt(index);
  }
}
