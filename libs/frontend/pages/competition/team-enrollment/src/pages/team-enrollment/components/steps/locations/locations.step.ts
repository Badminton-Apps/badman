import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Availability, Location } from '@badman/frontend-models';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { BehaviorSubject, Subject } from 'rxjs';
import { filter, map, startWith, takeUntil } from 'rxjs/operators';
import { CLUB, LOCATIONS, SEASON } from '../../../../../forms';
import {
  LocationAvailibilityForm,
  LocationComponent,
  LocationForm,
} from './components';

@Component({
  selector: 'badman-locations-step',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,

    // Material
    MatDialogModule,
    MatButtonModule,

    // Components
    LocationComponent,
  ],
  templateUrl: './locations.step.html',
  styleUrls: ['./locations.step.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationsStepComponent implements OnInit {
  destroy$ = new Subject<void>();

  @Input()
  group!: FormGroup;

  @Input()
  control?: FormArray<LocationForm>;

  @Input()
  controlName = LOCATIONS;

  @Input()
  clubControlName = CLUB;

  @Input()
  clubId?: string;

  @Input()
  seasonControlName = SEASON;

  @Input()
  season?: number;

  #season!: BehaviorSubject<number>;
  get seasonValue() {
    return this.#season.value;
  }

  #club!: BehaviorSubject<string>;
  get clubValue() {
    return this.#club.value;
  }

  constructor(
    private apollo: Apollo,
    private formBuilder: FormBuilder,
    private dialog: MatDialog,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (this.group) {
      this.control = this.group?.get(
        this.controlName
      ) as FormArray<LocationForm>;
    }

    if (!this.control) {
      this.control = new FormArray<LocationForm>([]);
    }

    if (this.group) {
      this.group.addControl(this.controlName, this.control);
    }

    if (this.group === undefined) {
      if (this.clubId == undefined) {
        throw new Error('No clubId provided');
      }

      if (this.season == undefined) {
        throw new Error('No season provided');
      }
    }

    this.#club = new BehaviorSubject<string>(this.clubId as string);
    this.#season = new BehaviorSubject<number>(this.season as number);

    // fetch clubId
    if (this.group) {
      this.group?.valueChanges
        .pipe(
          takeUntil(this.destroy$),
          map((value) => value?.[this.clubControlName]),
          startWith(this.group.value?.[this.clubControlName]),
          filter((value) => value !== undefined && value?.length > 0),
          filter(
            (value) =>
              value.length === 36 &&
              value[8] === '-' &&
              value[13] === '-' &&
              value[18] === '-' &&
              value[23] === '-'
          )
        )
        ?.subscribe((clubId) => {
          this.#club.next(clubId);
        });

      this.group?.valueChanges
        .pipe(
          takeUntil(this.destroy$),
          map((value) => value?.[this.seasonControlName]),
          startWith(this.group.value?.[this.seasonControlName]),
          filter((value) => value !== undefined)
        )
        ?.subscribe((season) => {
          this.#season.next(season);
        });
    }

    this.apollo
      .query<{ locations: Location[] }>({
        query: gql`
          query Locations(
            $where: JSONObject
            $availibilitiesWhere: JSONObject
          ) {
            locations(where: $where) {
              id
              name
              address
              street
              streetNumber
              postalcode
              city
              state
              phone
              fax

              availibilities(where: $availibilitiesWhere) {
                id
                year
                days {
                  day
                  startTime
                  endTime
                  courts
                }
                exceptions {
                  start
                  end
                  courts
                }
              }
            }
          }
        `,
        variables: {
          where: {
            clubId: this.clubValue,
          },
          availibilitiesWhere: {
            year: {
              $or: [this.seasonValue, this.seasonValue - 1],
            },
          },
        },
      })
      .pipe(
        takeUntil(this.destroy$),
        map((result) =>
          result.data?.locations?.map((location) => new Location(location))
        )
      )
      ?.subscribe((locations) => {
        if (locations) {
          this.control?.clear();
          locations.forEach((location) => {
            // filter out the locations that are not available for the current season
            // if no availibilities are set, use the one from previous season
            let availibilty = location.availibilities?.find(
              (availibility) => availibility.year === this.seasonValue
            );

            if (!availibilty) {
              const lastSeason = (location.availibilities?.find(
                (availibility) => availibility.year === this.seasonValue - 1
              ) ?? {
                days: [],
              }) as Availability;

              availibilty = {
                ...lastSeason,
                year: this.seasonValue,
                exceptions: [],
              };
            }

            console.log(availibilty);

            const availibyForm = this.formBuilder.group({
              id: this.formBuilder.control(availibilty?.id),
              year: this.formBuilder.control(availibilty?.year),
              days: this.formBuilder.array(
                availibilty?.days?.map((day) =>
                  this.formBuilder.group({
                    day: this.formBuilder.control(day.day),
                    startTime: this.formBuilder.control(day.startTime),
                    endTime: this.formBuilder.control(day.endTime),
                    courts: this.formBuilder.control(day.courts),
                  })
                ) ?? []
              ),
              exceptions: this.formBuilder.array(
                availibilty?.exceptions?.map((exception) =>
                  this.formBuilder.group({
                    start: this.formBuilder.control(exception.start),
                    end: this.formBuilder.control(exception.end),
                    courts: this.formBuilder.control(exception.courts),
                  })
                ) ?? []
              ),
            }) as LocationAvailibilityForm;

            const group = this.formBuilder.group({
              id: this.formBuilder.control(location.id),
              name: this.formBuilder.control(location.name),
              address: this.formBuilder.control(location.address),
              street: this.formBuilder.control(location.street),
              streetNumber: this.formBuilder.control(location.streetNumber),
              postalcode: this.formBuilder.control(location.postalcode),
              city: this.formBuilder.control(location.city),
              state: this.formBuilder.control(location.state),
              phone: this.formBuilder.control(location.phone),
              fax: this.formBuilder.control(location.fax),
              availibilities: this.formBuilder.array([availibyForm]),
            }) as LocationForm;

            this.control?.push(group);
          });

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  addLocation() {
    import('@badman/frontend-club').then((m) => {
      const dialogRef = this.dialog.open(m.LocationDialogComponent, {
        data: {
          club: { id: this.clubValue },
          onCreate: 'close',
          showAvailibilities: false,
        },
        autoFocus: false,
      });

      dialogRef.afterClosed().subscribe((location?: Location) => {
        this.control?.push(
          this.formBuilder.group({
            id: this.formBuilder.control(location?.id),
            name: this.formBuilder.control(location?.name),
            address: this.formBuilder.control(location?.address),
            street: this.formBuilder.control(location?.street),
            streetNumber: this.formBuilder.control(location?.streetNumber),
            postalcode: this.formBuilder.control(location?.postalcode),
            city: this.formBuilder.control(location?.city),
            state: this.formBuilder.control(location?.state),
            phone: this.formBuilder.control(location?.phone),
            fax: this.formBuilder.control(location?.fax),
            availibilities: this.formBuilder.array(
              [] as LocationAvailibilityForm[]
            ),
          }) as LocationForm
        );
      });
    });
  }

  removeLocation(index: number) {
    this.control?.removeAt(index);
  }

  editLocation(index: number) {
    const control = this.control?.at(index) as FormGroup;

    import('@badman/frontend-club').then((m) => {
      const dialogRef = this.dialog.open(m.LocationDialogComponent, {
        data: {
          location: control.value,
          club: this.clubValue,
          onUpdate: 'close',
          showAvailibilities: false,
        },
        autoFocus: false,
      });

      dialogRef.afterClosed().subscribe((newLocation?: Location) => {
        control.patchValue({
          id: newLocation?.id,
          name: newLocation?.name,
          address: newLocation?.address,
          street: newLocation?.street,
          streetNumber: newLocation?.streetNumber,
          postalcode: newLocation?.postalcode,
          city: newLocation?.city,
          state: newLocation?.state,
          phone: newLocation?.phone,
          fax: newLocation?.fax,
        });
      });
    });
  }
}
