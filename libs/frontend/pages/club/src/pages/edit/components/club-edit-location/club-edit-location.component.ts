import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, input, inject, output } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BadmanBlockModule, HasClaimComponent } from '@badman/frontend-components';
import { Club, Location } from '@badman/frontend-models';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, MutationResult, gql } from 'apollo-angular';
import { Observable, forkJoin } from 'rxjs';

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
  season: FormControl<number>;
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
  availabilities: FormArray<LocationAvailibilityForm>;
}>;

@Component({
  selector: 'badman-club-edit-location',
  templateUrl: './club-edit-location.component.html',
  styleUrls: ['./club-edit-location.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDividerModule,
    MatMenuModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatOptionModule,
    MatDatepickerModule,
    MatTooltipModule,
    TranslateModule,
    MatListModule,
    MatSelectModule,
    MatInputModule,
    MatSnackBarModule,
    HasClaimComponent,
    BadmanBlockModule,
  ],
})
export class ClubEditLocationComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private apollo = inject(Apollo);
  private snackBar = inject(MatSnackBar);
  whenEdit = output<Location>();
  whenDelete = output<Location>();

  club = input.required<Club>();

  location = input.required<Location>();

  control = input<LocationAvailibilityForm>();
  protected internalControl!: LocationAvailibilityForm;

  season = input<number | undefined>();

  days!: FormArray<LocationavDayType>;
  exceptions!: FormArray<LocationExceptionType>;
  expanded = {
    start: undefined,
    end: undefined,
    days: true,
    exceptions: false,
  };

  showCourts: {
    manualOpen: boolean;
    autoOpen: boolean;
  }[] = [];

  ngOnInit(): void {
    const availibilty = this.location().availabilities?.find(
      (availibility) => availibility.season === this.season(),
    );

    this.days = this.formBuilder.array(
      availibilty?.days?.map((day) =>
        this.formBuilder.group({
          day: this.formBuilder.control(day.day),
          startTime: this.formBuilder.control(day.startTime),
          endTime: this.formBuilder.control(day.endTime),
          courts: this.formBuilder.control(day.courts),
        }),
      ) ?? [],
    ) as FormArray<LocationavDayType>;

    this.exceptions = this.formBuilder.array(
      availibilty?.exceptions?.map((exception) =>
        this.formBuilder.group({
          start: this.formBuilder.control(exception.start),
          end: this.formBuilder.control(exception.end),
          courts: this.formBuilder.control(exception.courts),
        }),
      ) ?? [],
    ) as FormArray<LocationExceptionType>;

    if (this.control() != undefined) {
      this.internalControl = this.control() as LocationAvailibilityForm;
    }

    if (!this.internalControl) {
      this.internalControl = this.formBuilder.group({
        id: this.formBuilder.control(availibilty?.id),
        season: this.formBuilder.control(availibilty?.season ?? this.season()),
        days: this.days,
        exceptions: this.exceptions,
      }) as LocationAvailibilityForm;
    }

    if (this.exceptions.length !== 0) {
      this.expanded.exceptions = true;
    }

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
      }) as LocationavDayType,
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
      }) as LocationExceptionType,
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

  save() {
    const observables: Observable<MutationResult<unknown>>[] = [];
    const availibility = this.internalControl?.getRawValue();

    if (!availibility?.id) {
      observables.push(
        this.apollo.mutate({
          mutation: gql`
            mutation CreateAvailability($data: AvailabilityNewInput!) {
              createAvailability(data: $data) {
                id
              }
            }
          `,
          variables: {
            data: {
              season: this?.season(),
              locationId: this.location().id,
              days: availibility?.days,
              exceptions: availibility?.exceptions,
            },
          },
        }),
      );
    } else {
      observables.push(
        this.apollo.mutate({
          mutation: gql`
            mutation UpdateAvailability($data: AvailabilityUpdateInput!) {
              updateAvailability(data: $data) {
                id
              }
            }
          `,
          variables: {
            data: {
              id: availibility.id,
              season: this.season(),
              locationId: this.location().id,
              days: availibility.days,
              exceptions: availibility.exceptions,
            },
          },
        }),
      );
    }

    forkJoin(observables).subscribe(() => {
      this.snackBar.open('Saved', undefined, {
        duration: 1000,
        panelClass: 'success',
      });
    });
  }
}
