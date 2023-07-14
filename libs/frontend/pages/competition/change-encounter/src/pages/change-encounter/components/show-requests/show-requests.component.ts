import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
  TemplateRef,
  ViewChild,
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
import { AuthenticateService } from '@badman/frontend-auth';
import {
  Comment,
  EncounterChange,
  EncounterChangeDate,
  EncounterCompetition,
} from '@badman/frontend-models';
import { ChangeEncounterAvailability } from '@badman/utils';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';
import { MomentModule } from 'ngx-moment';
import { Observable, lastValueFrom, of } from 'rxjs';
import { filter, map, switchMap, tap } from 'rxjs/operators';
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

    // Material
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

    // Own
    DateSelectorComponent,
    CommentsComponent,
    RequestDateComponent,
  ],
})
export class ShowRequestsComponent implements OnInit {
  @Input()
  group!: FormGroup;

  @Input()
  dependsOn = 'encounter';

  formGroupRequest!: FormGroup;
  previous?: AbstractControl;
  dateControls = new FormArray<FormGroup>([]);
  dateControlsNotAvailible = new FormArray<FormGroup>([]);
  commentControl = new FormControl<string>('');

  encounter!: EncounterCompetition;
  home!: boolean;
  running = false;

  minDate: Date = new Date('2021-09-01');
  maxDate: Date = new Date('2022-05-01');

  requestClosed = false;
  requestClosing!: moment.Moment;

  comments = signal<Comment[]>([]);

  requests$!: Observable<EncounterChange>;
  @ViewChild('confirm', { static: true }) confirmDialog!: TemplateRef<unknown>;

  constructor(
    private _apollo: Apollo,
    private _dialog: MatDialog,
    private _snackBar: MatSnackBar,
    private _cd: ChangeDetectorRef,
    private _translate: TranslateService,
    public authenticateService: AuthenticateService
  ) {}

  async ngOnInit() {
    this.previous = this.group.get(this.dependsOn) ?? undefined;
    if (this.previous) {
      this.requests$ = this.previous.valueChanges.pipe(
        filter((value) => value !== null),
        tap((encounter: EncounterCompetition) => {
          this.encounter = encounter;
          this.requestClosing = moment(
            encounter?.drawCompetition?.subEventCompetition?.eventCompetition
              ?.changeCloseRequestDate
          );
          this.requestClosed = moment().isAfter(this.requestClosing);

          this.running = false;

          if (encounter == null) {
            this._cd.detectChanges();
          } else {
            this.home = this.group.get('team')?.value == encounter?.home?.id;
          }
        }),
        filter((value) => value !== null),
        switchMap((encounter: EncounterCompetition) => {
          if (encounter?.encounterChange?.id == undefined) {
            return of(
              new EncounterChange({
                encounter: encounter,
              })
            );
          }

          return this._apollo
            .watchQuery<{
              encounterChange: EncounterChange;
            }>({
              query: CHANGE_QUERY,
              variables: {
                id: encounter?.encounterChange?.id,
              },
            })
            .valueChanges.pipe(
              map(
                (x) =>
                  new EncounterChange({
                    ...x.data?.encounterChange,
                    encounter: encounter,
                  })
              )
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

          encounterChange?.dates?.map((r) => this._addDateControl(r));
        })
      );
    } else {
      console.warn(`Dependency ${this.dependsOn} not found`, this.previous);
    }
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
        .reduce((a, b) => (a > b ? a : b)) as Date;
    }

    const newDate = new EncounterChangeDate({
      date: moment(lastDate).add(1, 'week').toDate(),
    });

    if (this.home) {
      newDate.availabilityHome = ChangeEncounterAvailability.POSSIBLE;
    } else {
      newDate.availabilityAway = ChangeEncounterAvailability.POSSIBLE;
    }

    this._addDateControl(newDate);
  }

  removeDate(control: FormArray, index: number) {
    control.removeAt(index);
  }

  async save() {
    console.log('save', this.formGroupRequest.valid);

    if (this.running) {
      return;
    }

    if (!this.formGroupRequest.valid) {
      this._snackBar.open(
        this._translate.instant('competition.change-encounter.errors.invalid'),
        'OK',
        {
          duration: 4000,
        }
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
        })
    );
    const ids = dates.map((o) => o.date?.getTime());
    change.dates = dates.filter(
      ({ date }, index) => !ids.includes(date?.getTime(), index + 1)
    );
    change.accepted = change.dates.some((r) => r.selected == true);

    if (change.dates == null || (change.dates?.length ?? 0) == 0) {
      if (this.home) {
        // hometeam always needs to add at least one date
        this._snackBar.open(
          this._translate.instant(
            'competition.change-encounter.errors.select-one-date'
          ),
          'OK',
          {
            duration: 4000,
          }
        );
        this.running = false;
        return;
      }
    }

    const success = async () => {
      try {
        await lastValueFrom(
          this._apollo.mutate<{
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
            refetchQueries: (result) => [
              {
                query: CHANGE_QUERY,
                variables: {
                  id: result.data?.addChangeEncounter?.id,
                },
              },
            ],
          })
        );

        const teamControl = this.group.get('team');
        if (!teamControl) {
          throw new Error('Team control not found');
        }

        teamControl.setValue(teamControl.value);
        this.group.get(this.dependsOn)?.setValue(null);
        this._snackBar.open(
          await this._translate.instant(
            'competition.change-encounter.requested'
          ),
          'OK',
          {
            duration: 4000,
          }
        );
      } catch (error) {
        console.error(error);
        this._snackBar.open(
          await this._translate.instant(
            'competition.change-encounter.requested-failed'
          ),
          'OK',
          {
            duration: 4000,
          }
        );
      } finally {
        this.running = false;
        this._cd.detectChanges();
      }
    };

    if (change.accepted) {
      const changed = change.dates.find((r) => r.selected == true);
      const dialog = this._dialog.open(this.confirmDialog, {
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
    this._cd.detectChanges();
  }

  reOpen() {
    this.formGroupRequest.get('accepted')?.setValue(false);
    for (const control of this.dateControls.controls) {
      control.get('selected')?.setValue(false);
    }
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
      (dateChange.availabilityHome ==
        ChangeEncounterAvailability.NOT_POSSIBLE ||
        dateChange.availabilityAway == ChangeEncounterAvailability.NOT_POSSIBLE)
    ) {
      this.dateControlsNotAvailible.push(dateControl);
    } else {
      this.dateControls.push(dateControl);
    }
  }
}
