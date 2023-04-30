import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  QueryList,
  TemplateRef,
  ViewChild,
  ViewChildren,
} from '@angular/core';
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
  SubEventCompetition,
  Team,
} from '@badman/frontend-models';
import { transferState } from '@badman/frontend-utils';
import {
  LevelType,
  SubEventType,
  SubEventTypeEnum,
  TeamMembershipType,
  UseForTeamName,
  getLetterForRegion,
} from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import {
  BehaviorSubject,
  Observable,
  Subject,
  combineLatest,
  lastValueFrom,
  of,
} from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  startWith,
  switchMap,
  take,
  takeUntil,
  tap,
} from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { ValidationResult } from '../../../models';
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

    // Material
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
export class TeamsStepComponent implements OnInit, OnDestroy {
  #validationResult = new BehaviorSubject<ValidationResult | null>(null);

  get validationResult() {
    return this.#validationResult.value;
  }

  destroy$ = new Subject<void>();

  // get striug array  of event types
  eventTypes = Object.values(SubEventTypeEnum);

  @Input()
  group!: FormGroup;

  @Input()
  control?: FormGroup<FormArrayOfTeams>;

  @Input()
  controlName = 'teams';

  @ViewChildren(TeamEnrollmentComponent, { read: ElementRef })
  teamReferences: QueryList<ElementRef<HTMLElement>> | undefined;

  // get temmplate ref for dialog
  @ViewChild('switch')
  SwitchDialog!: TemplateRef<HTMLElement>;

  subEvents$?: Observable<{
    [key in SubEventType]: SubEventCompetition[];
  }>;

  teamNumbers: {
    [key in SubEventType]: number[];
  } = {
    F: [],
    M: [],
    MX: [],
    NATIONAL: [],
  };
  clubs$!: Observable<Club>;

  getTypeArray(type: SubEventType) {
    return this.control?.controls[type] as FormArray<TeamForm>;
  }

  constructor(
    private changedector: ChangeDetectorRef,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private apollo: Apollo
  ) {}

  ngOnInit() {
    let existed = false;
    if (this.group) {
      this.control = this.group?.get(
        this.controlName
      ) as FormGroup<FormArrayOfTeams>;

      existed = true;
    }

    if (!this.control) {
      this.control = new FormGroup({
        M: new FormArray<TeamForm>([]),
        F: new FormArray<TeamForm>([]),
        MX: new FormArray<TeamForm>([]),
        NATIONAL: new FormArray<TeamForm>([]),
      });
    }

    if (this.group && !existed) {
      this.group.addControl(this.controlName, this.control);
    }

    // initial teamnumbers
    this.teamNumbers.M =
      this.control?.value?.M?.map((t) => t.team?.teamNumber ?? 0) ?? [];
    this.teamNumbers.F =
      this.control?.value?.F?.map((t) => t.team?.teamNumber ?? 0) ?? [];
    this.teamNumbers.MX =
      this.control?.value?.MX?.map((t) => t.team?.teamNumber ?? 0) ?? [];
    this.teamNumbers.NATIONAL =
      this.control?.value?.NATIONAL?.map((t) => t.team?.teamNumber ?? 0) ?? [];

    this.clubs$ = this._getClubs();
    this.subEvents$ = this._getSubEvents();

    const initialSubevents = this.setInitialSubEvents();
    if (initialSubevents) {
      combineLatest(initialSubevents)
        .pipe(take(1))
        .subscribe(() => {
          this.control?.valueChanges
            .pipe(
              takeUntil(this.destroy$),
              startWith(this.control?.value),
              debounceTime(200),
              switchMap((v) =>
                this.validateEnrollment(v as FormArrayOfTeamsValue)
              )
            )
            .subscribe((v) => {
              if (v?.data?.enrollmentValidation) {
                this.#validationResult.next(v?.data?.enrollmentValidation);
                this.changedector.markForCheck();
              }
            });
        });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async addTeam(type: SubEventType) {
    const teams = this.control?.get(type) as FormArray<TeamForm>;
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
      }) as TeamForm
    );

    const ref = this.snackBar.open(
      `Team ${team.name} added at the end`,
      'Scroll naar team',
      {
        duration: 2000,
      }
    );

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

    const teams = this.control?.get(team.type) as FormArray<TeamForm>;
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
      if (!team.id) return;
      const teams = this.control?.value?.[type] || ([] as Team[]);
      // this.control
      //   ?.get(type)
      //   ?.setValue(
      //     this.changeNumber(team.id, result.newNumber, club, teams)?.sort(
      //       (a, b) => (a.teamNumber ?? 0) - (b.teamNumber ?? 0)
      //     )
      //   );
      this.changedector.markForCheck();
    });
  }

  teamValidationResult(id?: string) {
    if (!id) {
      return undefined;
    }
    return this.validationResult?.teams?.find((t) => t.id === id);
  }

  private changeNumber(
    teamId: string,
    newNumber: number,
    club: Club,
    teams: Team[]
  ) {
    const teamIndex = teams.findIndex((t) => t.id === teamId);
    const current = teams[teamIndex].teamNumber ?? 0;

    const lowestNumber = Math.min(current ?? 0, newNumber);
    const highestNumber = Math.max(current ?? 0, newNumber);

    teams
      .filter(
        (t) =>
          (t.teamNumber ?? 0) >= lowestNumber && (t.teamNumber ?? 0) < current
      )
      .forEach((t) => {
        t.teamNumber = (t.teamNumber ?? 0) + 1;
        t.name = this.getTeamName(t, club);
      });

    // update all higher numbers
    teams
      .filter(
        (t) =>
          (t.teamNumber ?? 0) > current && (t.teamNumber ?? 0) <= highestNumber
      )
      .forEach((t) => {
        t.teamNumber = (t.teamNumber ?? 0) - 1;
        t.name = this.getTeamName(t, club);
      });

    // update the teamnumber of the team that was changed
    teams[teamIndex].teamNumber = newNumber;
    teams[teamIndex].name = this.getTeamName(teams[teamIndex], club);
    return teams;
  }

  private getTeamName(team: Team, club: Club) {
    let teamName = '';
    switch (club?.useForTeamName ?? UseForTeamName.NAME) {
      case UseForTeamName.FULL_NAME:
        teamName = `${club.fullName} ${team.teamNumber}${getLetterForRegion(
          team.type as SubEventTypeEnum,
          'vl'
        )}`;
        break;
      case UseForTeamName.ABBREVIATION:
        teamName = `${club.abbreviation} ${team.teamNumber}${getLetterForRegion(
          team.type as SubEventTypeEnum,
          'vl'
        )}`;
        break;

      default:
      case UseForTeamName.NAME:
        teamName = `${club.name} ${team.teamNumber}${getLetterForRegion(
          team.type as SubEventTypeEnum,
          'vl'
        )}`;
        break;
    }

    return teamName;
  }

  private validateEnrollment(input?: FormArrayOfTeamsValue) {
    if (!input) return of();
    const teams: {
      id?: string;
      type: SubEventTypeEnum;
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
          type: team.team.type,
          teamNumber: team.team.teamNumber,
          subEventId: team.entry.subEventId,
          players: team.team?.players
            ?.map((p) => p.id)
            ?.filter((p) => p) as string[],
          backupPlayers: team.team.players
            ?.filter((p) => p.membershipType == TeamMembershipType.BACKUP)
            ?.map((p) => p.id)
            ?.filter((p) => p) as string[],
          basePlayers: team.entry?.players
            ?.map((p) => p.id)
            ?.filter((p) => p) as string[],
        });
      });
    }

    return this.apollo.query<{ enrollmentValidation: ValidationResult }>({
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
          teams,
        },
      },
    });
  }

  private _getClubs() {
    const clubId = this.group.get('club')?.value;
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
        transferState(`club-${clubId}`),
        map((r) => {
          if (!r?.data.club) {
            throw new Error('Club not found');
          }
          return new Club(r.data.club);
        }),
        shareReplay(1)
      );
  }

  private _getSubEvents() {
    const eventsVal$ = this.group.get('events')?.valueChanges;

    if (!eventsVal$) {
      return;
    }

    return eventsVal$.pipe(
      startWith(this.group.get('events')?.value),
      filter((events) => !!events && events.length > 0),
      distinctUntilChanged(),
      switchMap((events: string[]) => {
        return this.apollo.query<{
          subEventCompetitions: Partial<SubEventCompetition>[];
        }>({
          query: gql`
            query subEvents($where: JSONObject) {
              subEventCompetitions(where: $where) {
                id
                name
                eventType
                level
                maxLevel
                minBaseIndex
                maxBaseIndex
                eventCompetition {
                  id
                  type
                }
              }
            }
          `,
          variables: {
            where: {
              eventId: events,
            },
          },
        });
      }),
      map((result) => {
        const subEvents =
          result.data.subEventCompetitions?.map(
            (subEvent) => new SubEventCompetition(subEvent)
          ) ?? [];
        return {
          M: subEvents.filter((subEvent) => subEvent.eventType === 'M'),
          F: subEvents.filter((subEvent) => subEvent.eventType === 'F'),
          MX: subEvents.filter(
            (subEvent) =>
              subEvent?.eventType === 'MX' &&
              subEvent?.eventCompetition?.type &&
              subEvent?.eventCompetition?.type != LevelType.NATIONAL
          ),
          NATIONAL: subEvents.filter(
            (subEvent) =>
              subEvent?.eventType === 'MX' &&
              subEvent?.eventCompetition?.type &&
              subEvent?.eventCompetition?.type == LevelType.NATIONAL
          ),
        };
      }),
      shareReplay(1)
    );
  }

  private _maxLevels(subs: SubEventCompetition[]) {
    return {
      PROV: Math.max(
        ...(subs
          ?.filter((s) => s.eventCompetition?.type === LevelType.PROV)
          .map((s) => s.level ?? 0) ?? [])
      ),
      LIGA: Math.max(
        ...(subs
          ?.filter((s) => s.eventCompetition?.type === LevelType.LIGA)
          .map((s) => s.level ?? 0) ?? [])
      ),
      NATIONAL: Math.max(
        ...(subs
          ?.filter((s) => s.eventCompetition?.type === LevelType.NATIONAL)
          .map((s) => s.level ?? 0) ?? [])
      ),
    };
  }

  private setInitialSubEvents() {
    const obs = [];

    if (!this.subEvents$) {
      return;
    }

    for (const type of this.eventTypes) {
      const control = this.control?.get(type) as FormArray<TeamForm>;
      if (!control) {
        continue;
      }
      const teams = control.value;
      // combibne control f value changes with subevents
      obs.push(
        this.subEvents$.pipe(
          map((subEvents) => subEvents[type]),
          shareReplay(1),
          tap((subs) => {
            this.teamNumbers.NATIONAL =
              teams
                ?.map((t) => t.team?.teamNumber ?? 0)
                ?.sort((a, b) => a - b) ?? [];

            const maxLevels = this._maxLevels(subs);
            for (let i = 0; i < teams.length; i++) {
              const team = teams[i];
              if (!team) {
                continue;
              }

              const initial = this.getInitialSubEvent(
                team as TeamFormValue,
                subs,
                maxLevels
              );
              if (initial) {
                control
                  ?.at(i)
                  ?.get('entry')
                  ?.get<string>('subEventId')
                  ?.patchValue(initial, {
                    emitEvent: false,
                  });
              }
            }

            this.changedector.markForCheck();
          })
        )
      );
    }

    return obs;
  }

  private getInitialSubEvent(
    team: TeamFormValue,
    subs: SubEventCompetition[],
    maxLevels: ReturnType<typeof this._maxLevels>
  ) {
    let subEventId: string | undefined;
    let type = team.team.entry?.subEventCompetition?.eventCompetition?.type;
    const level = team.team.entry?.subEventCompetition?.level ?? 0;
    if (team.team.entry?.standing?.riser) {
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
        (sub) => sub.level === newLevel && type === sub.eventCompetition?.type
      )?.id;
    } else if (team.team.entry?.standing?.faller) {
      let newLevel = level - 1;
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
        (sub) => sub.level === level + 1 && type === sub.eventCompetition?.type
      )?.id;
    } else {
      subEventId = subs?.find(
        (sub) =>
          sub.level === team.team.entry?.subEventCompetition?.level &&
          type === sub.eventCompetition?.type
      )?.id;
    }

    return subEventId;
  }
}
