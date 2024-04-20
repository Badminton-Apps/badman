import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { EntryCompetitionPlayer, Team } from '@badman/frontend-models';
import { TranslateModule } from '@ngx-translate/core';
import { TeamEnrollmentDataService } from '../../../service/team-enrollment.service';
import { SubEventTypeEnum, sortTeams } from '@badman/utils';
import { TEAMS } from '../../../../../forms';
import { MatListModule } from '@angular/material/list';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { pairwise, startWith, takeUntil } from 'rxjs';

export type TeamFormValue = {
  team: Team;
  entry: {
    players: EntryCompetitionPlayer[];
    subEventId: string | null;
  };
};

export type TeamForm = FormGroup<{
  team: FormControl<Team>;
  entry: FormGroup<{
    players: FormArray<FormControl<EntryCompetitionPlayer | null>>;
    subEventId: FormControl<string | null>;
  }>;
}>;

@Component({
  selector: 'badman-teams-transfer-step',
  standalone: true,
  imports: [
    CommonModule,
    MatCheckboxModule,
    MatButtonModule,
    MatListModule,
    MatProgressBarModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
  ],
  templateUrl: './teams-transfer.step.html',
  styleUrls: ['./teams-transfer.step.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamsTransferStepComponent {
  private readonly destroy$ = injectDestroy();
  private readonly dataService = inject(TeamEnrollmentDataService);

  club = this.dataService.state.club;
  loaded = this.dataService.state.loadedTeams;

  teamsCurrent = this.dataService.state.teams;
  teamsCurrentLinks = computed(() => this.teamsCurrent().map((team) => team.link));

  teamsLast = computed(() => this.club()?.teams?.sort(sortTeams) ?? []);
  teamsLastIds = computed(() => this.teamsLast().map((team) => team.id));
  teamLastLinks = computed(() => this.teamsLast().map((team) => team.link));

  newTeams = computed(() =>
    this.teamsCurrent().filter((team) => !this.teamLastLinks().includes(team.link)),
  );
  existingLinks = computed(() =>
    this.teamLastLinks().filter((link) => this.teamsCurrentLinks().includes(link)),
  );

  transferTeamsCtrl = new FormControl<string[]>([], { nonNullable: true });
  newTeamsCtrl = new FormControl<string[]>([]);

  formGroup = input.required<FormGroup>();
  teams = computed(
    () =>
      this.formGroup().get(TEAMS) as FormGroup<{
        [key in SubEventTypeEnum]: FormArray<TeamForm>;
      }>,
  );

  constructor() {
    this.transferTeamsCtrl.valueChanges
      .pipe(takeUntil(this.destroy$), startWith([] as string[]), pairwise())
      .subscribe(([prev, next]) => {
        // find removed teams
        const removedTeams = prev.filter((team) => !next.includes(team));
        for (const id of removedTeams) {
          this._removeTeam(id);
        }

        // find new teams
        const newTeams = next.filter((team) => !prev.includes(team));
        for (const id of newTeams) {
          this._addTeam(id);
        }
      });

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
        this.transferTeamsCtrl.patchValue(
          this.teamsLast()
            .filter((team) => this.existingLinks().includes(team.link))
            .map((team) => team.id),
        );
      });
    });
  }

  selectAll() {
    this.transferTeamsCtrl.setValue(this.teamsLastIds());
  }

  deselectAll() {
    this.transferTeamsCtrl.setValue([]);
  }

  private _addTeam(teamId: string) {
    const team = this.teamsLast().find((t) => t.id === teamId) as Team;
    const typedControl = this.teams().get(team.type ?? '') as FormArray<TeamForm>;
    let entry: {
      players: EntryCompetitionPlayer[];
      subEventId: string | null;
    };

    // convert entries
    if (team.entry) {
      entry = {
        players: (team.entry.meta?.competition?.players?.map((p) => {
          return {
            id: p.id,
            gender: p.gender,
            player: {
              id: p.player.id,
              fullName: p.player.fullName,
            },
            single: p.player.rankingPlaces?.[0].single ?? 0,
            double: p.player.rankingPlaces?.[0].double ?? 0,
            mix: p.player.rankingPlaces?.[0].mix ?? 0,
          };
        }) ?? []) as EntryCompetitionPlayer[],
        subEventId: null,
      };
    } else {
      entry = {
        players: [] as EntryCompetitionPlayer[],
        subEventId: null,
      };
    }

    const newGroup = new FormGroup({
      team: new FormControl(team as Team),
      entry: new FormGroup({
        players: new FormArray(entry.players.map((p) => new FormControl(p))),
        subEventId: new FormControl(entry.subEventId),
      }),
    }) as TeamForm;

    typedControl.push(newGroup);
  }

  private _removeTeam(teamId: string) {
    // We look in all sub event types for the team and remove it just to be sure when deleting
    for (const enumType of Object.values(SubEventTypeEnum)) {
      const typedControl = this.teams().get(enumType) as FormArray<TeamForm>;

      const index = typedControl.controls.findIndex((control) => control.value.team?.id === teamId);
      if (index >= 0) {
        typedControl.removeAt(index);
      }
    }
  }
}
