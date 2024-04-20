import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Signal,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { SubEventType, SubEventTypeEnum, getUpcommingSeason } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { TEAMS } from '../../../../../forms';
import { TeamEnrollmentDataService } from '../../../service/team-enrollment.service';
import { TeamForm } from '../teams-transfer';
import { TeamEnrollmentComponent } from './components';
import { RankingSystemService } from '@badman/frontend-graphql';
import { RankingSystem, SubEventCompetition } from '@badman/frontend-models';

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
export class TeamsStepComponent {
  private readonly destroy$ = injectDestroy();
  private readonly dataService = inject(TeamEnrollmentDataService);
  private readonly systemService = inject(RankingSystemService);

  club = this.dataService.state.club;
  loaded = this.dataService.state.loadedTeams;
  season = this.dataService.state.season as Signal<number>;
  system = this.systemService.system as Signal<RankingSystem>;

  formGroup = input.required<FormGroup>();
  teams = computed(
    () =>
      this.formGroup().get(TEAMS) as FormGroup<{
        [key in SubEventTypeEnum]: FormArray<TeamForm>;
      }>,
  );

  eventsPerType = this.dataService.state.eventsPerType;
  eventTypes = Object.values(SubEventTypeEnum);

  constructor() {
    // set initial controls
    effect(() => {
      // get club
      const club = this.club();

      // wait for teams to be loaded, and also reload when anything changes
      if (!this.loaded() || !club?.id) {
        return;
      }

      // use the state but don't update effect when it changes
      untracked(() => {
        for (const type of this.eventTypes) {
          const subEvents = this.eventsPerType()[type];
          const teams = this.teams().get(type) as FormArray<TeamForm>;

          // iterate over each team and set the initial sub event
          teams.controls.forEach((team) => {
            this.setInitialSubEvent(team, subEvents);
          });
        }
      });
    });
  }

  getTypeArray(type: SubEventType) {
    return this.teams()?.controls[type] as FormArray<TeamForm>;
  }

  addTeam(type: SubEventType) {
    throw new Error('Not implemented');
  }

  setInitialSubEvent(team: TeamForm, subEvents: SubEventCompetition[]) {
    const subEventId = subEvents[0]?.id;

    if (!subEventId) {
      console.error('No sub events found for team', team.value, subEvents);
      return;
    }

    team.get('entry')?.get('subEventId')?.setValue(subEventId);
  }
}
