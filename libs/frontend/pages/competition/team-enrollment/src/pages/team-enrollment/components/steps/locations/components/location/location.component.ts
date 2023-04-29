import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  FormsModule,
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

import { TranslateModule } from '@ngx-translate/core';
import { MomentModule } from 'ngx-moment';
import { Subject } from 'rxjs';

export type LocationavAilibilityType = FormGroup<{
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
  availibilities: FormArray<LocationavAilibilityType>;
  exceptions: FormArray<LocationExceptionType>;
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

  availibilities!: FormArray<LocationavAilibilityType>;
  exceptions!: FormArray<LocationExceptionType>;

  expanded = {
    days: true,
    exceptions: false,
  };

  ngOnInit(): void {
    this.availibilities = this.group.get(
      'availibilities'
    ) as FormArray<LocationavAilibilityType>;

    this.exceptions = this.group.get(
      'exceptions'
    ) as FormArray<LocationExceptionType>;
  }

  addAvailibility() {
    this.availibilities.push(
      new FormGroup({
        day: new FormControl(),
        startTime: new FormControl(),
        endTime: new FormControl(),
        courts: new FormControl(),
      })
    );
    this.expanded.days = true;
  }

  removeAvailibility(index: number) {
    this.availibilities.removeAt(index);
  }

  addException() {
    this.exceptions.push(
      new FormGroup({
        start: new FormControl(),
        end: new FormControl(),
        courts: new FormControl(),
      })
    );
    this.expanded.exceptions = true;
  }

  removeException(index: number) {
    this.exceptions.removeAt(index);
  }
}
