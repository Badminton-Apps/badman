import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  QueryList,
  Signal,
  TemplateRef,
  ViewChild,
  ViewChildren,
  computed,
  effect,
  inject,
  input,
  untracked,
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
import { SubEventType, SubEventTypeEnum, UseForTeamName, getLetterForRegion } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { debounceTime, map, pairwise, startWith, takeUntil } from 'rxjs/operators';
import { TEAMS } from '../../../../../forms';
import { TeamEnrollmentDataService } from '../../../service/team-enrollment.service';
import { TeamForm } from '../../../team-enrollment.page';
import { TeamEnrollmentComponent } from './components';
import { Club, EntryCompetitionPlayer, Team } from '@badman/frontend-models';
import { v4 as uuidv4 } from 'uuid';

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
})
export class TeamsStepComponent {
  private readonly destroy$ = injectDestroy();
  private readonly dataService = inject(TeamEnrollmentDataService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly changedetector = inject(ChangeDetectorRef);

  club = this.dataService.state.club;
  loaded = this.dataService.state.loadedTeams;
  season = this.dataService.state.season as Signal<number>;

  formGroup = input.required<FormGroup>();
  teams = computed(
    () =>
      this.formGroup().get(TEAMS) as FormGroup<{
        [key in SubEventTypeEnum]: FormArray<TeamForm>;
      }>,
  );

  teamNumbers = computed(() => {
    const teams = this.teams();
    if (!teams) return;

    const numbers = {} as { [key in SubEventTypeEnum]: number };
    for (const type of this.eventTypes) {
      numbers[type] = teams.get(type)?.value.length ?? 0;
    }

    return numbers;
  });

  eventsPerType = this.dataService.state.eventsPerType;
  eventTypes = Object.values(SubEventTypeEnum);

  @ViewChildren(TeamEnrollmentComponent, { read: ElementRef })
  teamReferences: QueryList<ElementRef<HTMLElement>> | undefined;

  @ViewChild('switch')
  SwitchDialog!: TemplateRef<HTMLElement>;

  constructor() {
    effect(() => {
      untracked(() => {
        this.teams()
          .valueChanges.pipe(takeUntil(this.destroy$), debounceTime(600))
          .subscribe(() => {
            this.dataService.state.validateEnrollment({
              teamForm: this.teams().getRawValue(),
              season: this.season(),
              clubId: this.club()?.id ?? '',
            });
          });

        this.teams()
          .valueChanges.pipe(
            takeUntil(this.destroy$),
            debounceTime(600),
            startWith(this.teams().value),
            map(
              (value) =>
                (value.F?.length ?? 0) +
                (value.M?.length ?? 0) +
                (value.MX?.length ?? 0) +
                (value.NATIONAL?.length ?? 0),
            ),
            pairwise(),
          )
          .subscribe(([prev, next]) => {
            if (prev != next) {
              // a team was added or removed
              this.setTeamnumbers();
            }
          });
      });
    });
  }

  getTypeArray(type: SubEventType) {
    return this.teams()?.controls[type] as FormArray<TeamForm>;
  }

  addTeam(type: SubEventType) {
    const teams = this.getTypeArray(type);
    const club = this.club();

    if (!teams) return;
    if (!club) return;

    const teamNumber = teams.value.length + 1;

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

  removeTeam(team: Team) {
    const type = team.type;
    if (!type) return;

    const teams = this.getTypeArray(type);
    if (!teams) return;

    const index = teams.controls.findIndex((control) => control.value.team?.id === team.id);
    const form = teams.at(index);

    const ref = this.snackBar.open(`Team ${team.name} removed`, 'Undo', {
      duration: 2000,
    });

    ref.onAction().subscribe(() => {
      teams.insert(index, form);
      this.changedetector.detectChanges();
    });

    teams.removeAt(index);
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

  private setTeamnumbers() {
    const club = this.club();
    if (!club) return;
    for (const type of this.eventTypes) {
      const teams = this.teams().get(type) as FormArray<TeamForm>;
      if (!teams) continue;

      for (let i = 0; i < teams.length; i++) {
        const team = teams.at(i)?.get('team') as FormControl<Team>;
        if (!team) continue;
        if (!team.value) continue;

        team.value.teamNumber = i + 1;
        team.value.name = this.getTeamName(team.value, club);
      }
    }
  }

  changeTeamNumber(team: Team) {
    if (!team) return;
    if (!team.type) return;
    const club = this.club();
    const type = team.type;
    if (!club) return;

    const ref = this.dialog.open(this.SwitchDialog, {
      data: {
        team,
        numbers: Array.from({ length: this.teamNumbers()?.[type] ?? 0 }, (_, i) => i + 1),
      },
    });

    ref.afterClosed().subscribe((result: { newNumber: number }) => {
      if (!result) return;
      if (!result.newNumber) return;
      if (!team.teamNumber) return;

      const newNumber = result.newNumber;
      const teams = this.getTypeArray(type);
      if (!teams) return;

      const index = teams.controls.findIndex((control) => control.value.team?.id === team.id);
      const form = teams.at(index);

      teams.removeAt(index);
      teams.insert(newNumber - 1, form);

      this.setTeamnumbers();
      this.changedetector.detectChanges();
    });
  }
}
