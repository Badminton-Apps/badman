import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  TemplateRef,
  ViewChild,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatOptionModule } from '@angular/material/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { InMemoryCache } from '@apollo/client/cache';
import { ClaimService } from '@badman/frontend-auth';
import { HasClaimComponent, SetEncounterDateDialogComponent } from '@badman/frontend-components';
import { APOLLO_CACHE } from '@badman/frontend-graphql';
import {
  Comment,
  EncounterChange,
  EncounterChangeDate,
  EncounterCompetition,
} from '@badman/frontend-models';
import { ChangeEncounterAvailability, getSeasonPeriod } from '@badman/utils';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';
import { MomentModule } from 'ngx-moment';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { Observable, lastValueFrom, of } from 'rxjs';
import { debounceTime, filter, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { DateSelectorComponent } from '../../../../components';
import { CommentsComponent } from '../../../../components/comments';
import { RequestDateComponent } from '../request-date/request-date.component';

const CHANGE_QUERY = gql`
  query EncounterChange($id: ID!) {
    encounterChange(id: $id) {
      id
      accepted
      dates {
        id
        date
        locationId
        availabilityHome
        availabilityAway
      }
    }
  }
`;

@Component({
  selector: 'badman-show-requests',
  templateUrl: './show-requests.component.html',
  styleUrls: ['./show-requests.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    TranslateModule,
    MomentModule,
    MatFormFieldModule,
    MatOptionModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatInputModule,
    MatCheckboxModule,
    MatSelectModule,
    MatProgressBarModule,
    MatExpansionModule,
    MatTooltipModule,
    DateSelectorComponent,
    CommentsComponent,
    RequestDateComponent,
    HasClaimComponent,
  ],
})
export class ShowRequestsComponent implements OnInit {
  showCompact = input<boolean | undefined>(false);
  private readonly destroy$ = injectDestroy();
  private cache = inject<InMemoryCache>(APOLLO_CACHE);
  private readonly apollo = inject(Apollo);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly translate = inject(TranslateService);
  private readonly claimService = inject(ClaimService);
  group = input.required<FormGroup>();

  dependsOn = input('encounter');

  formGroupRequest!: FormGroup;
  previous?: AbstractControl;
  dateControls = new FormArray<FormGroup>([]);
  dateControlsNotAvailible = new FormArray<FormGroup>([]);
  commentControl = new FormControl<string>('');

  encounter!: EncounterCompetition;
  home!: boolean;
  running = false;

  requestingClosed = false;
  requestClosing!: moment.Moment;

  isAdmin = computed(() => this.claimService.hasAnyClaims(['change-any:encounter']));

  canChangeEncounter = computed<boolean>(() => false);
  comments = signal<Comment[]>([]);

  requests$!: Observable<EncounterChange>;
  @ViewChild('confirm', { static: true }) confirmDialog!: TemplateRef<unknown>;

  validation = signal<{
    valid: boolean;
    errors: {
      params: { [key: string]: unknown };
      message: string;
    }[];
    warnings: {
      params: { [key: string]: unknown };
      message: string;
    }[];
  }>({
    valid: true,
    errors: [],
    warnings: [],
  });

  warnings = computed(() => this.validation()?.warnings ?? []);

  async ngOnInit() {
    this.previous = this.group().get(this.dependsOn()) ?? undefined;
    if (this.previous) {
      this.requests$ = this.previous.valueChanges.pipe(
        tap((encounter: EncounterCompetition) => {
          this.encounter = encounter;
          const event = encounter?.drawCompetition?.subEventCompetition?.eventCompetition;
          if (event?.changeCloseDatePeriod1 || event?.changeCloseDatePeriod2) {
            if (encounter.date?.getFullYear() == event.season) {
              this.requestClosing = moment(event?.changeCloseDatePeriod1);
            } else {
              this.requestClosing = moment(event?.changeCloseDatePeriod2);
            }

            console.log(
              'requestClosing',
              event?.changeCloseDatePeriod2,
              event.season,
              encounter.date?.getFullYear(),
            );

            this.requestingClosed = moment().isAfter(this.requestClosing);
          } else {
            this.requestingClosed = false;
          }

          this.running = false;

          if (encounter == null) {
            this.changeDetector.detectChanges();
          } else {
            this.home = this.group().get('team')?.value == encounter?.home?.id;
          }
        }),
        filter((value) => value !== null),
        switchMap((encounter: EncounterCompetition) => {
          if (encounter?.encounterChange?.id == undefined) {
            return of(
              new EncounterChange({
                encounter: encounter,
              }),
            );
          }

          return this.apollo
            .query<{
              encounterChange: EncounterChange;
            }>({
              query: CHANGE_QUERY,
              variables: {
                id: encounter?.encounterChange?.id,
              },
            })
            .pipe(
              map(
                (x) =>
                  new EncounterChange({
                    ...x.data?.encounterChange,
                    encounter: encounter,
                  }),
              ),
            );
        }),
        tap((encounterChange) => {
          this.dateControls = new FormArray<FormGroup>([]);
          this.dateControlsNotAvailible = new FormArray<FormGroup>([]);

          this.formGroupRequest = new FormGroup({
            id: new FormControl(encounterChange?.id),
            dates: this.dateControls,
            notAvailibleDates: this.dateControlsNotAvailible,
            accepted: new FormControl(encounterChange?.accepted),
          });

          this.formGroupRequest.valueChanges
            .pipe(
              takeUntil(this.destroy$),
              debounceTime(100),
              switchMap(() => this.validate()),
            )
            .subscribe((result) => {
              if (result) {
                this.validation.set(result);
              }
            });

          encounterChange?.dates?.map((r) => this._addDateControl(r));
        }),
      );
    } else {
      console.warn(`Dependency ${this.dependsOn()} not found`, this.previous);
    }
  }
  getWarnings(date: Date | string) {
    return computed(() =>
      this.warnings().filter(
        (r) =>
          moment(`${r.params['date']}`).isSame(date, 'day') &&
          r.params['encounterId'] == this.encounter.id,
      ),
    );
  }

  validate() {
    const suggestedDates = this.dateControls
      .getRawValue()
      .map((r) => r['calendar'])
      ?.map((r) => ({
        date: r.date,
        locationId: r.locationId,
      }));
    return this.apollo
      .query<{
        encounterCompetition: EncounterCompetition;
      }>({
        query: gql`
          query ValidateChangeEncounter(
            $encounterId: ID!
            $validationData: EncounterValidationInput!
          ) {
            encounterCompetition(id: $encounterId) {
              id
              validateEncounter(validationData: $validationData) {
                errors {
                  params
                  message
                }
                valid
                validators
                warnings {
                  message
                  params
                }
              }
            }
          }
        `,
        variables: {
          encounterId: this.encounter?.id,
          validationData: {
            teamId: this.group().get('team')?.value,
            suggestedDates,
          },
        },
      })
      ?.pipe(map((r) => r.data?.encounterCompetition.validateEncounter));
  }

  addDate() {
    let lastDate = this.encounter.date;
    const dates = [
      ...this.dateControls.getRawValue(),
      ...this.dateControlsNotAvailible.getRawValue(),
    ];
    if (dates && dates.length > 0) {
      // get the last date
      lastDate = dates
        .map((d) => d?.['calendar']?.['date'])
        .reduce((a, b) => (a > b ? a : b), new Date()) as Date;
    }

    let newDate = moment(lastDate).add(1, 'week');
    const period = getSeasonPeriod()?.map((d) => moment(d));
    if (newDate.isAfter(period[1])) {
      newDate = period[1].subtract(1, 'day');
    }

    const newChange = new EncounterChangeDate({
      date: newDate.toDate(),
    });

    if (this.home) {
      newChange.availabilityHome = ChangeEncounterAvailability.POSSIBLE;
    } else {
      newChange.availabilityAway = ChangeEncounterAvailability.POSSIBLE;
    }

    this._addDateControl(newChange);
  }

  removeDate(control: FormArray, index: number) {
    control.removeAt(index);
  }

  async save() {
    if (this.running) {
      return;
    }

    if (!this.formGroupRequest.valid) {
      this.snackBar.open(
        this.translate.instant('competition.change-encounter.errors.invalid'),
        'OK',
        {
          duration: 4000,
        },
      );

      this.formGroupRequest.markAllAsTouched();

      return;
    }

    this.running = true;
    const change = new EncounterChange();
    change.encounter = this.encounter;

    const dates: EncounterChangeDate[] = [
      ...(this.formGroupRequest.get('dates')?.getRawValue() ?? []),
      ...(this.formGroupRequest.get('notAvailibleDates')?.getRawValue() ?? []),
    ]?.map(
      (d: {
        availabilityAway: ChangeEncounterAvailability;
        availabilityHome: ChangeEncounterAvailability;
        selected: boolean;
        calendar: {
          date: Date;
          locationId: string;
        };
      }) =>
        new EncounterChangeDate({
          availabilityAway: d?.availabilityAway,
          availabilityHome: d?.availabilityHome,
          selected: d?.selected,
          date: d?.calendar?.date,
          locationId: d?.calendar?.locationId,
        }),
    );
    const ids = dates.map((o) => o.date?.getTime());
    change.dates = dates.filter(({ date }, index) => !ids.includes(date?.getTime(), index + 1));
    change.accepted = change.dates.some((r) => r.selected);

    if (change.dates == null || (change.dates?.length ?? 0) == 0) {
      if (this.home) {
        // hometeam always needs to add at least one date
        this.snackBar.open(
          this.translate.instant('competition.change-encounter.errors.select-one-date'),
          'OK',
          {
            duration: 4000,
          },
        );
        this.running = false;
        return;
      }
    }

    const success = async () => {
      try {
        const result = await lastValueFrom(
          this.apollo.mutate<{
            addChangeEncounter: EncounterChange;
          }>({
            mutation: gql`
              mutation AddChangeEncounter($data: EncounterChangeNewInput!) {
                addChangeEncounter(data: $data) {
                  id
                }
              }
            `,
            variables: {
              data: {
                accepted: change.accepted,
                encounterId: change.encounter?.id,
                home: this.home,
                dates: change.dates,
              },
            },
          }),
        );

        if (this.encounter.encounterChange?.id) {
          const normalizedAvailibility = this.cache.identify({
            id: this.encounter.encounterChange?.id,
            __typename: 'EncounterChange',
          });
          this.cache.evict({ id: normalizedAvailibility });
          this.cache.gc();
        }

        this.previous?.setValue({
          ...this.previous.value,
          encounterChange: {
            accepted: change.accepted,
            encounterId: change.encounter?.id,
            home: this.home,
            dates: change.dates,
            id: result.data?.addChangeEncounter?.id,
          },
        });

        this.snackBar.open(
          await this.translate.instant('all.competition.change-encounter.requested'),
          'OK',
          {
            duration: 4000,
          },
        );
      } catch (error) {
        console.error(error);
        this.snackBar.open(
          await this.translate.instant('all.competition.change-encounter.requested-failed'),
          'OK',
          {
            duration: 4000,
          },
        );
      } finally {
        this.running = false;
        this.changeDetector.detectChanges();
      }
    };

    if (change.accepted) {
      const changed = change.dates.find((r) => r.selected);
      const dialog = this.dialog.open(this.confirmDialog, {
        data: {
          changedLocation: changed?.locationId != this.encounter?.location?.id,
        },
      });
      dialog.afterClosed().subscribe(async (confirmed) => {
        if (confirmed) {
          await success();
        }
      });
    } else {
      await success();
    }

    this.running = false;
    this.changeDetector.detectChanges();
  }

  async cancel() {
    await lastValueFrom(
      this.apollo.mutate<{
        addChangeEncounter: EncounterChange;
      }>({
        mutation: gql`
          mutation UpdateChangeEncounter($data: EncounterChangeUpdateInput!) {
            updateEncounterChange(data: $data) {
              accepted
            }
          }
        `,
        variables: {
          data: {
            id: this.encounter.encounterChange?.id,
            accepted: true,
          },
        },
      }),
    );

    this.previous?.setValue({
      ...this.previous.value,
      encounterChange: {
        id: null,
      },
    });

    this.formGroupRequest.get('accepted')?.setValue(true);
    this.changeDetector.detectChanges();
  }

  reOpen() {
    this.formGroupRequest.get('accepted')?.setValue(false);
    for (const control of this.dateControls.controls) {
      control.get('selected')?.setValue(false);
    }
  }
  changeDate() {
    // open dialog
    const ref = this.dialog.open(SetEncounterDateDialogComponent, {
      data: {
        date: this.encounter.date,
      },
      width: '400px',
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.apollo
          .mutate({
            mutation: gql`
              mutation ChangeDate(
                $id: ID!
                $date: DateTime!
                $updateBadman: Boolean!
                $updateVisual: Boolean!
                $closeChangeRequests: Boolean!
              ) {
                changeDate(
                  id: $id
                  date: $date
                  updateBadman: $updateBadman
                  updateVisual: $updateVisual
                  closeChangeRequests: $closeChangeRequests
                )
              }
            `,
            variables: {
              id: this.encounter.id,
              date: result.openDate,
              updateBadman: result.updateBadman,
              updateVisual: result.updateVisual,
              closeChangeRequests: result.closeChangeRequests,
            },
          })
          .subscribe(() => {
            this.snackBar.open(`Dates updated`, 'Close', {
              duration: 2000,
            });
          });
      }
    });
  }

  private _addDateControl(dateChange: EncounterChangeDate) {
    const id = new FormControl(dateChange?.id);
    const availabilityHome = new FormControl(dateChange.availabilityHome);
    const availabilityAway = new FormControl(dateChange.availabilityAway);
    const selected = new FormControl(false);

    const calendar = new FormControl({
      date: dateChange.date,
      locationId: dateChange.locationId ?? this.encounter?.location?.id,
    });

    if (dateChange.id) {
      calendar.disable();
    }

    if (this.home) {
      availabilityAway.disable();
    } else {
      availabilityHome.disable();
    }

    const dateControl = new FormGroup({
      id,
      calendar,
      availabilityHome,
      availabilityAway,
      selected,
    });

    // check if the availability is not possible for one of the teams but both filled in
    if (
      dateChange.availabilityHome != null &&
      dateChange.availabilityAway != null &&
      (dateChange.availabilityHome == ChangeEncounterAvailability.NOT_POSSIBLE ||
        dateChange.availabilityAway == ChangeEncounterAvailability.NOT_POSSIBLE)
    ) {
      this.dateControlsNotAvailible.push(dateControl);
    } else {
      this.dateControls.push(dateControl);
    }
  }
}
