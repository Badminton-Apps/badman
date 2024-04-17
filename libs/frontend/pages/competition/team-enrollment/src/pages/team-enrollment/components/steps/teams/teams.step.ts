import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Injector,
  OnInit,
  PLATFORM_ID,
  QueryList,
  TemplateRef,
  TransferState,
  ViewChild,
  ViewChildren,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  Club,
  EntryCompetitionPlayer,
  EventCompetition,
  RankingSystem,
  SubEventCompetition,
  Team,
  ValidationResult,
} from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import {
  LevelType,
  SubEventType,
  SubEventTypeEnum,
  TeamMembershipType,
  UseForTeamName,
  getLetterForRegion,
  sortSubEventOrder,
  sortTeams,
} from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { BehaviorSubject, Observable, combineLatest, lastValueFrom, of } from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  startWith,
  switchMap,
  takeUntil,
  throttleTime,
} from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { CLUB, EVENTS, SEASON, TEAMS } from '../../../../../forms';
import { TeamForm, TeamFormValue } from '../teams-transfer';
import { TeamEnrollmentComponent } from './components';

type FormArrayOfTeams = {
  [key in SubEventType]: FormArray<TeamForm>;
};

type FormArrayOfTeamsValue = {
  [key in SubEventType]: Partial<
    {
      team: Team;
      entry: {
        subEventId: string;
        players: EntryCompetitionPlayer[];
      };
    }[]
  >;
};

@Component({
  selector: 'badman-teams-step',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDividerModule,
    MatProgressBarModule,
    TeamEnrollmentComponent,
  ],
  templateUrl: './teams.step.html',
  styleUrls: ['./teams.step.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamsStepComponent implements OnInit {
  private readonly destroy$ = injectDestroy();
  private readonly injector = inject(Injector);
  private readonly changedector = inject(ChangeDetectorRef);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly apollo = inject(Apollo);
  private readonly stateTransfer = inject(TransferState);
  private readonly platformId = inject(PLATFORM_ID);

  loadedSubEvents = signal(false);
  loadedInitialEvents = signal(false);
  allLoaded = computed(() => {
    console.log('all loaded', this.loadedSubEvents(), this.loadedInitialEvents());
    return this.loadedSubEvents() && this.loadedInitialEvents();
  });

  #validationResult = new BehaviorSubject<ValidationResult | null>(null);
  get validationResult() {
    return this.#validationResult.value;
  }

  // get striug array  of event types
  eventTypes = Object.values(SubEventTypeEnum);

  formGroup = input.required<FormGroup>();

  control = input<FormGroup<FormArrayOfTeams>>();
  protected internalControl!: FormGroup<FormArrayOfTeams>;

  controlName = input(TEAMS);

  seasonControlName = input(SEASON);

  clubControlName = input(CLUB);

  eventsControlName = input(EVENTS);

  @ViewChildren(TeamEnrollmentComponent, { read: ElementRef })
  teamReferences: QueryList<ElementRef<HTMLElement>> | undefined;

  // get temmplate ref for dialog
  @ViewChild('switch')
  SwitchDialog!: TemplateRef<HTMLElement>;

  teamNumbers: {
    [key in SubEventType]: number[];
  } = {
    F: [],
    M: [],
    MX: [],
    NATIONAL: [],
  };
  clubs$!: Observable<Club>;
  season!: number;
  system = input.required<RankingSystem>();

  getTypeArray(type: SubEventType) {
    return this.internalControl?.controls[type] as FormArray<TeamForm>;
  }

  ngOnInit() {
    let existed = false;
    if (this.control() != undefined) {
      this.internalControl = this.control() as FormGroup<FormArrayOfTeams>;
      existed = true;
    }

    if (!this.internalControl && this.formGroup()) {
      this.internalControl = this.formGroup().get(
        this.controlName(),
      ) as FormGroup<FormArrayOfTeams>;

      existed = true;
    }

    if (!this.internalControl) {
      this.internalControl = new FormGroup({
        M: new FormArray<TeamForm>([]),
        F: new FormArray<TeamForm>([]),
        MX: new FormArray<TeamForm>([]),
        NATIONAL: new FormArray<TeamForm>([]),
      });
    }

    if (this.formGroup() && !existed) {
      this.formGroup().addControl(this.controlName(), this.internalControl);
    }

    this.internalControl.setErrors({ loading: true });
    // validate the enrollment when the control changes
    combineLatest([
      this.internalControl?.valueChanges,
      toObservable(this.allLoaded, {
        injector: this.injector,
      }),
    ])
      .pipe(
        takeUntil(this.destroy$),
        filter(([, loaded]) => loaded),
        throttleTime(200),
        switchMap(() =>
          this.validateEnrollment(this.internalControl.getRawValue() as FormArrayOfTeamsValue),
        ),
      )
      .subscribe((v) => {
        if (v?.data?.enrollmentValidation) {
          this.#validationResult.next(v?.data?.enrollmentValidation);
          this.changedector.markForCheck();
        }
      });

    this.clubs$ = this._getClubs();
    this._getSubEvents().subscribe((subs) => {
      this.formGroup().get(this.eventsControlName())?.patchValue(subs);
      this.loadedSubEvents.set(true);

      // set initial events if they are empty
      this.internalControl.valueChanges
        .pipe(
          startWith(null),
          takeUntil(this.destroy$),
          distinctUntilChanged((a, b) => {
            if (!a || !b) return false;

            // only update if something changed in the teams array
            const aIds = Object.values(a).map((t) => t.map((t) => t.team?.id).join());
            const bIds = Object.values(b).map((t) => t.map((t) => t.team?.id).join());

            return aIds.join() === bIds.join();
          }),
        )
        .subscribe(async () => {
          this.loadedInitialEvents.set(false);

          // initial teamnumbers from 1 to maxlevel
          for (const type of this.eventTypes) {
            const maxLevel = Math.max(
              ...(this.internalControl?.value?.[type]?.map((t) => t.team?.teamNumber ?? 0) ?? []),
              this.internalControl?.value?.[type]?.length ?? 0,
            );

            this.teamNumbers[type] = Array.from({ length: maxLevel }, (_, i) => i + 1);
          }

          // check if there are
          await this.setTeamnumbers();

          this.setInitialSubEvents();
          console.log('initial events set');

          this.loadedInitialEvents.set(true);
        });
    });

    this.season = this.formGroup().get(SEASON)?.value as number;
  }

  async addTeam(type: SubEventType) {
    const teams = this.internalControl?.get(type) as FormArray<TeamForm>;
    const club = await lastValueFrom(this.clubs$);

    const teamNumber = teams.length + 1;

    const team = new Team({
      id: uuidv4(),
      type: type as SubEventTypeEnum,
      teamNumber,
      clubId: club.id,
    });

    team.name = this.getTeamName(team, club);
    teams.push(
      new FormGroup({
        team: new FormControl(team),
        entry: new FormGroup({
          players: new FormArray<FormControl<EntryCompetitionPlayer>>([]),
          subEventId: new FormControl(null),
        }),
      }) as TeamForm,
    );

    const ref = this.snackBar.open(`Team ${team.name} added at the end`, 'Scroll naar team', {
      duration: 2000,
    });

    this.changedector.markForCheck();

    ref.onAction().subscribe(() => {
      setTimeout(() => {
        if (!this.teamReferences) return;
        const teamToScrollTo = this.teamReferences
          .map((reference) => reference.nativeElement)
          .find((element) => element.getAttribute('data-anchor') === team.id);

        if (teamToScrollTo) {
          teamToScrollTo.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }, 300);
    });
  }

  async removeTeam(team: Team) {
    if (!team) return;
    if (!team.type) return;
    const club = await lastValueFrom(this.clubs$);

    const teams = this.internalControl?.get(team.type) as FormArray<TeamForm>;
    const index = teams.controls.findIndex((t) => t.value.team?.id === team.id);

    if (index < 0) return;

    teams.removeAt(index);

    // update lower team numbers
    for (let i = index; i < teams.length; i++) {
      const t = teams.at(i).value.team;
      if (t) {
        t.teamNumber = i + 1;
        t.name = this.getTeamName(t, club);
      }
    }
  }

  async changeTeamNumber(team: Team) {
    if (!team) return;
    if (!team.type) return;
    const club = await lastValueFrom(this.clubs$);
    const type = team.type;

    const ref = this.dialog.open(this.SwitchDialog, {
      data: {
        team,
        numbers: this.teamNumbers?.[type],
      },
    });

    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      if (!result.newNumber) return;
      if (!team.teamNumber) return;

      const newNumber = result.newNumber;
      this.changeNumber(team.teamNumber, newNumber, club, type);
      // sort teams in control

      const teams = this.internalControl?.get(type) as FormArray<TeamForm>;
      teams.controls.sort((a: TeamForm, b: TeamForm) =>
        sortTeams(a.value.team as Team, b.value.team as Team),
      );

      this.changedector.markForCheck();
    });
  }

  teamValidationResult(id?: string) {
    if (!id) {
      return undefined;
    }
    return this.validationResult?.teams?.find((t) => t.id === id);
  }

  private changeNumber(oldNumber: number, newNumber: number, club: Club, type: SubEventTypeEnum) {
    const teams = this.internalControl?.get(type) as FormArray<TeamForm>;
    // iterate over all controls and update the team number / name
    teams.controls.forEach((t) => {
      const tControl = t.get('team');
      const team = tControl?.value as Team;
      if (!tControl?.value.teamNumber) return;

      if (tControl?.value.teamNumber === oldNumber) {
        team.teamNumber = newNumber;

        tControl?.patchValue({
          ...team,
          teamNumber: newNumber,
          name: this.getTeamName(team, club),
        } as Team);
      }

      // if the number is lower than the old number, increase the number of all teams between the new and old number
      else if (
        newNumber < oldNumber &&
        tControl?.value.teamNumber >= newNumber &&
        tControl?.value.teamNumber < oldNumber
      ) {
        team.teamNumber = (team.teamNumber ?? 0) + 1;
        tControl?.patchValue({
          ...team,
          teamNumber: team.teamNumber,
          name: this.getTeamName(team, club),
        } as Team);
      }

      // if the number is higher than the old number, decrease the number of all teams between the new and old number
      else if (
        newNumber > oldNumber &&
        tControl?.value.teamNumber <= newNumber &&
        tControl?.value.teamNumber > oldNumber
      ) {
        team.teamNumber = (team.teamNumber ?? 0) - 1;

        tControl?.patchValue({
          ...team,
          teamNumber: team.teamNumber,
          name: this.getTeamName(team, club),
        } as Team);
      }
    });
  }

  private getTeamName(team: Team, club: Club) {
    let teamName = '';
    switch (club?.useForTeamName ?? UseForTeamName.NAME) {
      case UseForTeamName.FULL_NAME:
        teamName = `${club.fullName} ${team.teamNumber}${getLetterForRegion(team.type as SubEventTypeEnum, 'vl')}`;
        break;
      case UseForTeamName.ABBREVIATION:
        teamName = `${club.abbreviation} ${team.teamNumber}${getLetterForRegion(team.type as SubEventTypeEnum, 'vl')}`;
        break;

      default:
      case UseForTeamName.NAME:
        teamName = `${club.name} ${team.teamNumber}${getLetterForRegion(team.type as SubEventTypeEnum, 'vl')}`;
        break;
    }

    return teamName;
  }

  private validateEnrollment(input?: FormArrayOfTeamsValue) {
    if (!input) return of();
    const teams: {
      id?: string;
      name?: string;
      type: SubEventTypeEnum;
      link?: string;
      teamNumber?: number;
      subEventId?: string;
      players?: string[];
      backupPlayers?: string[];
      basePlayers?: string[];
    }[] = [];

    //  type of SubEventTypeEnum
    for (const type in SubEventTypeEnum) {
      input[type as SubEventTypeEnum].forEach((team) => {
        if (!team) return;
        if (!team.team) return;
        if (!team.team.type) return;

        teams.push({
          id: team.team.id,
          name: team.team.name,
          type: team.team.type,
          teamNumber: team.team.teamNumber,
          subEventId: team.entry.subEventId,
          link: team.team.link,
          players: team.team?.players?.map((p) => p.id)?.filter((p) => p) as string[],
          backupPlayers: team.team.players
            ?.filter((p) => p.membershipType == TeamMembershipType.BACKUP)
            ?.map((p) => p.id)
            ?.filter((p) => p) as string[],
          basePlayers: team.entry?.players?.map((p) => p.id)?.filter((p) => p) as string[],
        });
      });
    }

    return this.apollo.query<{ enrollmentValidation: ValidationResult }>({
      fetchPolicy: 'no-cache',
      query: gql`
        query ValidateEnrollment($enrollment: EnrollmentInput!) {
          enrollmentValidation(enrollment: $enrollment) {
            teams {
              id
              linkId
              teamIndex
              baseIndex
              isNewTeam
              possibleOldTeam
              maxLevel
              minBaseIndex
              maxBaseIndex
              valid
              errors {
                message
                params
              }
              warnings {
                message
                params
              }
            }
          }
        }
      `,
      variables: {
        enrollment: {
          season: this.formGroup().get(this.seasonControlName())?.value,
          teams,
        },
      },
    });
  }

  private _getClubs() {
    const clubId = this.formGroup().get(this.clubControlName())?.value;
    return this.apollo
      .query<{ club: Club }>({
        query: gql`
          query Club($id: ID!) {
            club(id: $id) {
              id
              name
            }
          }
        `,
        variables: {
          id: clubId,
        },
      })
      .pipe(
        transferState(`club-${clubId}`, this.stateTransfer, this.platformId),
        map((r) => {
          if (!r?.data.club) {
            throw new Error('Club not found');
          }
          return new Club(r.data.club);
        }),
        shareReplay(1),
      );
  }

  private _getSubEvents() {
    const clubCtrl = this.formGroup().get(this.clubControlName());

    if (!clubCtrl) {
      throw new Error('Club control not found');
    }

    return clubCtrl.valueChanges.pipe(
      startWith(clubCtrl.value),
      switchMap((clubId) =>
        this.apollo.query<{
          club: Club;
        }>({
          query: gql`
            query Club($id: ID!) {
              club(id: $id) {
                id
                state
              }
            }
          `,
          variables: {
            id: clubId,
          },
        }),
      ),
      map((result) => result.data.club as Club),
      switchMap((club) =>
        this.apollo.query<{
          eventCompetitions: {
            count: number;
            rows: Partial<EventCompetition>[];
          };
        }>({
          query: gql`
            query EventCompetition($where: JSONObject) {
              eventCompetitions(where: $where) {
                count
                rows {
                  id
                  type
                  state
                  name
                  subEventCompetitions {
                    id
                    name
                    eventType
                    level
                    maxLevel
                    minBaseIndex
                    maxBaseIndex
                  }
                }
              }
            }
          `,
          variables: {
            where: {
              openDate: { $lte: new Date().toISOString() },
              closeDate: { $gte: new Date().toISOString() },
              $or: [{ type: 'LIGA' }, { type: 'PROV', state: club.state }, { type: 'NATIONAL' }],
            },
          },
        }),
      ),
      map((result) => result.data.eventCompetitions?.rows?.map((e) => new EventCompetition(e))),
      map((result) => {
        const subEvents = result
          .map((event) => event.subEventCompetitions ?? [])
          .reduce((acc, val) => acc.concat(val), [] as SubEventCompetition[]);

        return {
          M: subEvents.filter((subEvent) => subEvent.eventType === 'M').sort(sortSubEventOrder),
          F: subEvents.filter((subEvent) => subEvent.eventType === 'F').sort(sortSubEventOrder),
          MX: subEvents
            .filter(
              (subEvent) =>
                subEvent?.eventType === 'MX' &&
                subEvent?.eventCompetition?.type &&
                subEvent?.eventCompetition?.type != LevelType.NATIONAL,
            )
            .sort(sortSubEventOrder),
          NATIONAL: subEvents
            .filter(
              (subEvent) =>
                subEvent?.eventType === 'MX' &&
                subEvent?.eventCompetition?.type &&
                subEvent?.eventCompetition?.type == LevelType.NATIONAL,
            )
            .sort(sortSubEventOrder),
        };
      }),
      shareReplay(1),
    );

    // const eventsVal$ = this.group().get(this.eventsControlName())?.valueChanges;

    // if (!eventsVal$) {
    //   throw new Error('Events control not found');
    // }

    // return eventsVal$.pipe(
    //   startWith(this.group().get(this.eventsControlName())?.value),
    //   filter((events) => !!events && events.length > 0),
    //   distinctUntilChanged(),
    //   switchMap((events: { name: LevelType; id: string }[]) => {
    //     return this.apollo.query<{
    //       subEventCompetitions: Partial<SubEventCompetition>[];
    //     }>({
    //       query: gql`
    //         query subEvents($where: JSONObject) {
    //           subEventCompetitions(where: $where) {
    //             id
    //             name
    //             eventType
    //             level
    //             maxLevel
    //             minBaseIndex
    //             maxBaseIndex
    //             eventCompetition {
    //               id
    //               type
    //             }
    //           }
    //         }
    //       `,
    //       variables: {
    //         where: {
    //           eventId: events?.map((e) => e.id),
    //         },
    //       },
    //     });
    //   }),
    //   map((result) => {
    //     const subEvents =
    //       result.data.subEventCompetitions?.map((subEvent) => new SubEventCompetition(subEvent)) ??
    //       [];

    //     return {
    //       M: subEvents.filter((subEvent) => subEvent.eventType === 'M').sort(sortSubEventOrder),
    //       F: subEvents.filter((subEvent) => subEvent.eventType === 'F').sort(sortSubEventOrder),
    //       MX: subEvents
    //         .filter(
    //           (subEvent) =>
    //             subEvent?.eventType === 'MX' &&
    //             subEvent?.eventCompetition?.type &&
    //             subEvent?.eventCompetition?.type != LevelType.NATIONAL,
    //         )
    //         .sort(sortSubEventOrder),
    //       NATIONAL: subEvents
    //         .filter(
    //           (subEvent) =>
    //             subEvent?.eventType === 'MX' &&
    //             subEvent?.eventCompetition?.type &&
    //             subEvent?.eventCompetition?.type == LevelType.NATIONAL,
    //         )
    //         .sort(sortSubEventOrder),
    //     };
    //   }),
    //   shareReplay(1),
    // );
  }

  private _maxLevels(subs: SubEventCompetition[]) {
    return {
      PROV: Math.max(
        ...(subs
          ?.filter((s) => s.eventCompetition?.type === LevelType.PROV)
          .map((s) => s.level ?? 0) ?? []),
      ),
      LIGA: Math.max(
        ...(subs
          ?.filter((s) => s.eventCompetition?.type === LevelType.LIGA)
          .map((s) => s.level ?? 0) ?? []),
      ),
      NATIONAL: Math.max(
        ...(subs
          ?.filter((s) => s.eventCompetition?.type === LevelType.NATIONAL)
          .map((s) => s.level ?? 0) ?? []),
      ),
    };
  }

  private setInitialSubEvents() {
    for (const type of this.eventTypes) {
      const control = this.internalControl?.get(type) as FormArray<TeamForm>;
      if (!control) {
        continue;
      }
      const teams = control.value;
      const subs = this.formGroup().get(this.eventsControlName())?.value[type];
      const maxLevels = this._maxLevels(subs);

      for (let i = 0; i < teams.length; i++) {
        const team = teams[i];
        if (!team) {
          continue;
        }
        if (!team.team?.id) {
          continue;
        }

        const current = control?.at(i)?.get('entry')?.get<string>('subEventId');
        if (current?.value) {
          continue;
        }

        const initial = this.getInitialSubEvent(team as TeamFormValue, subs, maxLevels);

        if (initial) {
          control?.at(i)?.get('entry')?.get<string>('subEventId')?.patchValue(initial);
        }
      }
    }
  }

  private getInitialSubEvent(
    team: TeamFormValue,
    subs: SubEventCompetition[],
    maxLevels: ReturnType<typeof this._maxLevels>,
  ) {
    let subEventId: string | undefined;
    let type = team.team?.entry?.subEventCompetition?.eventCompetition?.type;

    const level = team.team?.entry?.subEventCompetition?.level ?? 0;

    if (team.team?.entry?.standing?.riser) {
      let newLevel = level - 1;

      if (newLevel < 1) {
        // we promote to next level
        if (type === LevelType.PROV) {
          type = LevelType.LIGA;
          newLevel = maxLevels.LIGA;
        } else if (type === LevelType.LIGA) {
          type = LevelType.NATIONAL;
          newLevel = maxLevels.NATIONAL;
        }
      }

      subEventId = subs?.find(
        (sub) => sub.level === newLevel && type === sub.eventCompetition?.type,
      )?.id;
    } else if (team.team?.entry?.standing?.faller) {
      let newLevel = level + 1;

      if (newLevel > maxLevels.NATIONAL) {
        // we demote to lower level
        if (type === LevelType.NATIONAL) {
          type = LevelType.LIGA;
          newLevel = 1;
        } else if (type === LevelType.LIGA) {
          type = LevelType.PROV;
          newLevel = 1;
        }
      }

      subEventId = subs?.find(
        (sub) => sub.level === newLevel && sub.eventCompetition?.type === type,
      )?.id;
    } else {
      subEventId = subs?.find(
        (sub) =>
          sub.level === team.team?.entry?.subEventCompetition?.level &&
          type === sub.eventCompetition?.type,
      )?.id;
    }

    return subEventId;
  }

  private async setTeamnumbers() {
    for (const type of this.eventTypes) {
      const control = this.internalControl?.get(type) as FormArray<TeamForm>;
      if (!control) {
        continue;
      }
      const teams = control.value;
      const club = await lastValueFrom(this.clubs$);

      for (let i = 0; i < teams.length; i++) {
        const team = teams[i];
        if (!team) {
          continue;
        }
        if (!team.team?.id) {
          continue;
        }

        if (team.team?.teamNumber != i + 1) {
          this.changeNumber(team.team?.teamNumber ?? 0, i + 1, club, type);
        }
      }
    }
  }
}
