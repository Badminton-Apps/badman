import { CommonModule } from '@angular/common';
import {
  Component,
  Signal,
  TemplateRef,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ClaimService } from '@badman/frontend-auth';
import { EnrollmentMessageComponent } from '@badman/frontend-components';
import { RankingSystemService } from '@badman/frontend-graphql';
import {
  EntryCompetitionPlayer,
  RankingSystem,
  SubEventCompetition,
  Team,
} from '@badman/frontend-models';
import { LevelType, SubEventTypeEnum } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { TeamEnrollmentDataService } from '../../../../../service/team-enrollment.service';
import { TeamForm } from '../../../../../team-enrollment.page';
import { TeamComponent } from '../team';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'badman-team-enrollment',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    ReactiveFormsModule,
    FormsModule,
    TeamComponent,
    EnrollmentMessageComponent,
    TranslateModule,
  ],
  templateUrl: './team-enrollment.component.html',
  styleUrls: ['./team-enrollment.component.scss'],
})
export class TeamEnrollmentComponent {
  private readonly dataService = inject(TeamEnrollmentDataService);
  private readonly systemService = inject(RankingSystemService);
  private readonly auth = inject(ClaimService);
  private readonly dialog = inject(MatDialog);

  group = input.required<TeamForm>();
  transfers = input.required<string[]>();
  loans = input.required<string[]>();

  team = computed(() => this.group().get('team') as FormControl<Team>);
  type = computed(() => this.team().value.type ?? SubEventTypeEnum.M);
  entry = computed(() => this.group().get('entry') as FormGroup);
  subEvent = computed(() => this.entry().get('subEventId') as FormControl<string>);

  validation = computed(() =>
    this.dataService.state.validation()?.find((v) => v.id === this.team().value.id),
  );
  players = computed(
    () => this.entry().get('players') as FormArray<FormControl<EntryCompetitionPlayer>>,
  );
  subEventsForType = computed(() => this.dataService.state.eventsPerType()[this.type()]);

  levelExceptions = computed(() => {
    const errors = this.validation()?.errors ?? [];
    const warnings = this.validation()?.warnings ?? [];

    const players = [
      ...errors.filter(
        (e) => e.message === 'all.competition.team-enrollment.errors.player-min-level',
      ),
      ...warnings.filter(
        (e) => e.message === 'all.competition.team-enrollment.errors.player-min-level',
      ),
    ]
      ?.map((e: unknown) => e as { params: { player: { id: string; fullName: string } } })
      .map((e) => e.params.player);

    const uniquePlayers = Array.from(new Set(players.map((player) => player.id))).map((id) =>
      players.find((player) => player.id === id),
    ) as { id: string; fullName: string }[];

    return uniquePlayers;
  });

  @ViewChild('requestException')
  requestExceptionTemplateRef?: TemplateRef<HTMLElement>;

  canEnrollInAnyEvent = computed(() => this.auth.hasClaim('enlist-any-event:team'));

  system = this.systemService.system as Signal<RankingSystem>;
  // using a sinal to trigger the effect if needed
  automaticallyAssigned = signal(false);

  subEventsForTeam = computed(() => {
    const availibleSubs = this.subEventsForType();

    if (this.automaticallyAssigned()) {
      return availibleSubs;
    }

    const validation = this.validation();

    const filteredSubs = availibleSubs.filter((sub) => {
      return (
        (sub.minBaseIndex ?? 0) <= (validation?.baseIndex ?? 0) &&
        (sub.maxBaseIndex ?? 0) >= (validation?.baseIndex ?? 0)
      );
    });

    if (filteredSubs.length === 0) {
      // console.error('No sub events found for team', this.team.value, availibleSubs);
    }

    if (this.canEnrollInAnyEvent()) {
      const filteredIds = filteredSubs.map((sub) => sub.id);

      return availibleSubs.map((sub) => {
        if (filteredIds.includes(sub.id)) {
          return sub;
        }

        return {
          ...sub,
          name: `${sub.name} (out of range)`,
        };
      });
    }

    return filteredSubs;
  });

  removeTeam = output<Team>();

  changeTeamNumber = output<Team>();

  constructor() {
    effect(
      () => {
        if (this.subEventsForType().length <= 0) {
          return;
        }

        // if the this.subEvent().value is not set and the link is not empty, disable the subEvent control
        if (this.team()?.value.link && !this.subEvent().value) {
          this.setInitialSubEvent();
          if (this.subEvent().value && !this.canEnrollInAnyEvent()) {
            this.automaticallyAssigned.set(true);
            this.subEvent().disable();
          }
        }
      },
      {
        allowSignalWrites: true,
      },
    );
  }

  setInitialSubEvent() {
    if (!this.team) return;
    if (!this.subEvent) return;
    if (this.subEvent().value) return;
    const entry = this.team().getRawValue().entry;
    const level = entry?.subEventCompetition?.level ?? 0;
    const maxLevels = this._maxLevels(this.subEventsForType());
    const subs = this.subEventsForType();

    let type = entry?.subEventCompetition?.eventCompetition?.type ?? LevelType.PROV;
    let subEventId: string | undefined;

    if (entry?.standing?.riser) {
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
    } else if (entry?.standing?.faller) {
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
          sub.level === entry?.subEventCompetition?.level && type === sub.eventCompetition?.type,
      )?.id;
    }

    if (!subEventId) return;

    this.subEvent().patchValue(subEventId);
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

  requestLevelException(playerId: string) {
    if (!this.requestExceptionTemplateRef) {
      return;
    }

    const index = this.players().value.findIndex((p) => p.id === playerId);
    const player = this.players().at(index);
    // pop up a dialog to ask for the reason
    this.dialog
      .open(this.requestExceptionTemplateRef, {
        data: {
          player: player.value,
        },
      })
      .afterClosed()
      .subscribe((reason: HTMLTextAreaElement) => {
        if (!reason) {
          return;
        }

        // update the controls value
        player.patchValue({
          ...player.value,
          levelExceptionRequested: true,
          levelExceptionReason: reason.value,
        });
      });
  }
}
