import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { Location } from '@badman/frontend-models';
import { Apollo, gql } from 'apollo-angular';
import { Observable, Subject, combineLatest, of } from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  map,
  startWith,
  switchMap,
  takeUntil
} from 'rxjs/operators';

export type LocationForm = FormGroup<{
  location: FormControl<Location>;
}>;

@Component({
  selector: 'badman-locations-step',
  standalone: true,
  imports: [CommonModule],
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
  controlName = 'teams';

  @Input()
  clubControlName = 'club';

  @Input()
  clubId?: string;

  @Input()
  seasonControlName = 'season';

  @Input()
  season?: number;

  locations$?: Observable<Location[]>;

  constructor(private apollo: Apollo) {}

  ngOnInit() {
    if (this.group) {
      this.control = this.group?.get(this.controlName) as FormArray<LocationForm>;
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

    let clubid$: Observable<string>;
    let season$: Observable<number>;

    // fetch clubId
    if (this.group) {
      clubid$ = this.group?.valueChanges.pipe(
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
      );

      season$ = this.group?.valueChanges.pipe(
        map((value) => value?.[this.seasonControlName]),
        startWith(this.group.value?.[this.seasonControlName]),
        filter((value) => value !== undefined)
      );
    } else {
      clubid$ = of(this.clubId as string);
      season$ = of(this.season as number);
    }

    this.locations$ = combineLatest([
      clubid$.pipe(distinctUntilChanged()),
      season$.pipe(distinctUntilChanged()),
    ])?.pipe(
      takeUntil(this.destroy$),
      switchMap(([clubId, season]) =>
        this.apollo.query<{ locations: Location[] }>({
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
              clubId: clubId,
            },
            availibilitiesWhere: {
              year: season,
            },
          },
        })
      ),
      map((result) =>
        result.data?.locations?.map((location) => new Location(location))
      )
    );
  }
}
