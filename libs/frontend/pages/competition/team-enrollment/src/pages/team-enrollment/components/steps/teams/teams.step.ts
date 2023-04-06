import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnInit,
  QueryList,
  TemplateRef,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Club, SubEventCompetition, Team } from '@badman/frontend-models';
import {
  getLetterForRegion,
  LevelType,
  SubEventType,
  SubEventTypeEnum,
  UseForTeamName,
} from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { combineLatest, lastValueFrom, Observable } from 'rxjs';
import {
  filter,
  map,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { TeamComponent } from './components';

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

    // Own
    TeamComponent,
  ],
  templateUrl: './teams.step.html',
  styleUrls: ['./teams.step.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamsStepComponent implements OnInit {
  // get striug array  of event types
  eventTypes = Object.values(SubEventTypeEnum);

  @Input()
  group!: FormGroup;

  @Input()
  control?: FormGroup<{
    [key in SubEventType]: FormControl<Team[] | null | undefined>;
  }>;

  @Input()
  controlName = 'teams';

  @ViewChildren(TeamComponent, { read: ElementRef })
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

  constructor(
    private changedector: ChangeDetectorRef,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private apollo: Apollo
  ) {}

  ngOnInit() {
    let existed = false;
    if (this.group) {
      this.control = this.group?.get(this.controlName) as FormGroup<{
        [key in SubEventType]: FormControl<Team[] | null | undefined>;
      }>;
      existed = true;
    }

    if (!this.control) {
      this.control = new FormGroup({
        M: new FormControl<Team[] | null | undefined>([]),
        F: new FormControl<Team[] | null | undefined>([]),
        MX: new FormControl<Team[] | null | undefined>([]),
        NATIONAL: new FormControl<Team[] | null | undefined>([]),
      });
    }

    if (this.group && !existed) {
      this.group.addControl(this.controlName, this.control);
    }

    // initial teamnumbers
    this.teamNumbers.M =
      this.control?.value?.M?.map((t) => t.teamNumber ?? 0) ?? [];
    this.teamNumbers.F =
      this.control?.value?.F?.map((t) => t.teamNumber ?? 0) ?? [];
    this.teamNumbers.MX =
      this.control?.value?.MX?.map((t) => t.teamNumber ?? 0) ?? [];
    this.teamNumbers.NATIONAL =
      this.control?.value?.NATIONAL?.map((t) => t.teamNumber ?? 0) ?? [];

    const clubId = this.group.get('club')?.value;
    this.clubs$ = this.apollo
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
        map((r) => new Club(r.data.club)),
        shareReplay(1)
      );

    const eventsVal$ = this.group.get('events')?.valueChanges;

    if (!eventsVal$) {
      return;
    }

    this.subEvents$ = eventsVal$.pipe(
      startWith(this.group.get('events')?.value),
      filter((events) => !!events && events.length > 0),
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

    if (!this.subEvents$) {
      return;
    }

    for (const type of this.eventTypes) {
      const control = this.control?.get(type) as FormControl<Team[]>;
      if (!control) {
        continue;
      }
      const teams$ = control.valueChanges.pipe(
        startWith(control.value)
      ) as Observable<Team[]>;
      // combibne control f value changes with subevents
      combineLatest(
        this.subEvents$.pipe(
          map((subEvents) => subEvents[type]),
          shareReplay(1)
        ),
        teams$
      )
        .pipe()
        .subscribe(([subs, teams]) => {
          this.teamNumbers.NATIONAL =
            teams?.map((t) => t.teamNumber ?? 0)?.sort((a, b) => a - b) ?? [];

          this.setInitialSubEvent(subs, teams);

          this.changedector.markForCheck();
        });
    }
  }

  private setInitialSubEvent(subs: SubEventCompetition[], teams: Team[]) {
    // get highest level for each type
    const maxLevel = {
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

    for (const team of teams) {
      let newSub: SubEventCompetition | undefined;
      let type = team.entry?.competitionSubEvent?.eventCompetition?.type;
      const level = team.entry?.competitionSubEvent?.level ?? 0;
      if (team.entry?.standing?.riser) {
        let newLevel = level - 1;

        if (newLevel < 1) {
          // we promote to next level
          if (type === LevelType.PROV) {
            type = LevelType.LIGA;
            newLevel = maxLevel.LIGA;
          } else if (type === LevelType.LIGA) {
            type = LevelType.NATIONAL;
            newLevel = maxLevel.NATIONAL;
          }
        }

        newSub = subs?.find(
          (sub) => sub.level === newLevel && type === sub.eventCompetition?.type
        );
      } else if (team.entry?.standing?.faller) {
        let newLevel = level - 1;
        if (newLevel > maxLevel.NATIONAL) {
          // we demote to lower level
          if (type === LevelType.NATIONAL) {
            type = LevelType.LIGA;
            newLevel = 1;
          } else if (type === LevelType.LIGA) {
            type = LevelType.PROV;
            newLevel = 1;
          }
        }

        newSub = subs?.find(
          (sub) =>
            sub.level === level + 1 && type === sub.eventCompetition?.type
        );
      } else {
        newSub = subs?.find(
          (sub) =>
            sub.level === team.entry?.competitionSubEvent?.level &&
            type === sub.eventCompetition?.type
        );
      }

      if (team.entry && newSub) {
        team.entry.competitionSubEventId = newSub?.id;
      }
    }
  }

  async addTeam(type: SubEventType) {
    const teams = this.control?.value?.[type] || ([] as Team[]);
    const club = await lastValueFrom(this.clubs$);

    const teamNumber = teams.length + 1;

    const team = new Team({
      id: uuidv4(),
      type: type as SubEventTypeEnum,
      teamNumber,
      clubId: club.id,
    });

    team.name = this.getTeamName(team, club);
    teams.push(team);
    this.control?.get(type)?.setValue(teams, { emitEvent: true });

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
      }, 100);
    });
  }

  async removeTeam(team: Team) {
    if (!team) return;
    if (!team.type) return;
    const club = await lastValueFrom(this.clubs$);

    const teams = this.control?.value?.[team.type] || ([] as Team[]);
    const index = teams.findIndex((t) => t.teamNumber === team.teamNumber);
    if (index > -1) {
      teams.splice(index, 1);
      this.control?.get(team.type)?.setValue(teams);
    }

    // update lower teamnumbers
    teams
      .filter((t) => (t.teamNumber ?? 0) > (team.teamNumber ?? 0))
      .forEach((t) => {
        t.teamNumber = (t.teamNumber ?? 0) - 1;
        t.name = this.getTeamName(t, club);
      });
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
      this.control
        ?.get(type)
        ?.setValue(
          this.changeNumber(team.id, result.newNumber, club, teams)?.sort(
            (a, b) => (a.teamNumber ?? 0) - (b.teamNumber ?? 0)
          )
        );
      this.changedector.markForCheck();
    });
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
}
