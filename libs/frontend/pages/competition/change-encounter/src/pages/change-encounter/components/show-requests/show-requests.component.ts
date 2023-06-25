import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
  TemplateRef,
  ViewChild,
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
import { catchError, filter, map, switchMap, take, tap } from 'rxjs/operators';
import {
  DateSelectorComponent,
} from '../../../../components';
import { CommentsComponent } from '../../../../components/comments';

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

    // Own
    DateSelectorComponent,
    CommentsComponent,
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
  commentControl = new FormControl<string>('');

  encounter!: EncounterCompetition;
  home!: boolean;
  running = false;

  minDate: Date = new Date('2021-09-01');
  maxDate: Date = new Date('2022-05-01');

  comments: Comment[] = [];

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
        tap((encounter) => {
          this.encounter = encounter;
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
            return of(new EncounterChange());
          }

          return this._apollo
            .query<{
              encounterChange: EncounterChange;
            }>({
              query: gql`
                query EncounterChange($id: ID!) {
                  encounterChange(id: $id) {
                    id
                    accepted
                    dates {
                      id
                      date
                      availabilityHome
                      availabilityAway
                    }

                    homeComments {
                      id
                      message
                      player {
                        id
                        fullName
                      }
                      createdAt
                    }

                    awayComments {
                      id
                      message
                      player {
                        id
                        fullName
                      }
                      createdAt
                    }
                  }
                }
              `,
              variables: {
                id: encounter?.encounterChange?.id,
              },
            })
            .pipe(map((x) => new EncounterChange(x.data?.encounterChange)));
        }),
        tap((encounterChange) => {
          this.dateControls = new FormArray<FormGroup>([]);

          this.formGroupRequest = new FormGroup({
            id: new FormControl(encounterChange?.id),
            dates: this.dateControls,
          });

          this.comments = [
            encounterChange?.homeComments,
            encounterChange?.awayComments,
          ]
            .flat()
            .filter((x) => x != null)
            .sort((a, b) => {
              // show newest on bottom
              if (!a?.createdAt || !b?.createdAt) {
                throw new Error('Date is null');
              }

              return moment(b.createdAt).diff(moment(a.createdAt));
            }) as Comment[];

          encounterChange?.dates?.map((r) => this._addDateControl(r));

          // Set initial
          this._updateSelected();

          // Add subscription
          this.dateControls.valueChanges.subscribe(() =>
            this._updateSelected()
          );
        })
      );
    } else {
      console.warn(`Dependency ${this.dependsOn} not found`, this.previous);
    }
  }

  addDate() {
    let lastDate = this.encounter.date;
    const dates = this.dateControls.getRawValue();
    if (dates && dates.length > 0) {
      lastDate = dates.sort(
        (a: EncounterChangeDate, b: EncounterChangeDate) => {
          if (!a.date || !b.date) {
            throw new Error('Date is null');
          }

          // sort for newest date
          return moment(b.date).diff(moment(a.date));
        }
      )[0]['date'];
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

  removeDate(index: number) {
    this.dateControls.removeAt(index);
  }

  async save() {
    if (this.running) {
      return;
    }

    if (!this.formGroupRequest.valid) {
      return;
    }

    this.running = true;
    const change = new EncounterChange();
    change.encounter = this.encounter;

    const dates: EncounterChangeDate[] = this.formGroupRequest
      .get('dates')
      ?.getRawValue()
      ?.map(
        (d: {
          availabilityAway: ChangeEncounterAvailability;
          availabilityHome: ChangeEncounterAvailability;
          selected: boolean;
          date: Date;
        }) =>
          new EncounterChangeDate({
            availabilityAway: d?.availabilityAway,
            availabilityHome: d?.availabilityHome,
            selected: d?.selected,
            date: d?.date,
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
      // else if (
      //   change.awayComment == null ||
      //   (change.awayComment?.message?.length ?? 0) < 15
      // ) {
      //   // away team can have no dates but with a comment of at least to 15 characters
      //   this._snackBar.open(
      //     this._translate.instant(
      //       'competition.change-encounter.errors.select-one-date-or-comment'
      //     ),
      //     'OK',
      //     { duration: 4000 }
      //   );
      //   this.running = false;
      //   return;
      // }
    }

    const success = async () => {
      try {
        await lastValueFrom(
          this._apollo
            .mutate<{
              addChangeEncounter: EncounterChange;
            }>({
              mutation: gql`
                mutation AddChangeEncounter($data: EncounterChangeNewInput!) {
                  addChangeEncounter(data: $data)
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
            })
            .pipe()
        );

        // await this._encounterService
        //   .addEncounterChange(change, this.home)
        //   .toPromise();
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
      const dialog = this._dialog.open(this.confirmDialog);
      dialog.afterClosed().subscribe(async (confirmed) => {
        if (confirmed) {
          await success();
        }
      });
    } else {
      await success();
    }
  }

  private _updateSelected() {
    const selected = this.dateControls
      .getRawValue()
      .find((r) => r['selected'] == true);

    for (const control of this.dateControls.controls) {
      control.get('selected')?.disable({ emitEvent: false });

      if (
        (selected == null ||
          selected?.['date'] == control.get('date')?.value) &&
        control.get('availabilityHome')?.value ==
          ChangeEncounterAvailability.POSSIBLE &&
        control.get('availabilityAway')?.value ==
          ChangeEncounterAvailability.POSSIBLE
      ) {
        control.get('selected')?.enable({ emitEvent: false });
      }
    }
  }

  private _addDateControl(dateChange: EncounterChangeDate) {
    const id = new FormControl(dateChange?.id);
    const availabilityHome = new FormControl(dateChange.availabilityHome);
    const availabilityAway = new FormControl(dateChange.availabilityAway);
    const selected = new FormControl(false);
    const date = new FormControl(dateChange.date);

    if (dateChange.id) {
      date.disable();
    }

    if (this.home) {
      availabilityAway.disable();
    } else {
      availabilityHome.disable();
    }

    const dateControl = new FormGroup({
      id,
      date,
      availabilityHome,
      availabilityAway,
      selected,
    });

    this.dateControls.push(dateControl);
  }

  addComment() {
    this._apollo
      .mutate({
        mutation: gql`
          mutation AddChangeEncounterComment($data: CommentNewInput!) {
            addComment(data: $data) {
              id
            }
          }
        `,
        variables: {
          data: {
            message: this.commentControl.value,
            linkId: this.encounter?.encounterChange?.id,
            linkType: 'encounterChange',
            clubId: this.home
              ? this.encounter?.home?.clubId
              : this.encounter?.away?.clubId,
          },
        },
      })
      .pipe(
        take(1),
        catchError((err) => {
          console.error(err);
          return of(null);
        })
      )
      .subscribe((result) => {
        if (result) {
          this._snackBar.open(
            this._translate.instant(
              'competition.change-encounter.comment-added'
            ),
            'OK',
            {
              duration: 4000,
            }
          );
          this.commentControl.setValue('');
          this._cd.detectChanges();
        }
      });
  }
}
