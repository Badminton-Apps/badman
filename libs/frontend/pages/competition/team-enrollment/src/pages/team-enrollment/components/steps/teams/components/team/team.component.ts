import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PlayerSearchComponent } from '@badman/frontend-components';
import {
  EntryCompetitionPlayers,
  EventEntry,
  Player,
  RankingPlace,
  Team,
  TeamPlayer,
} from '@badman/frontend-models';
import { getIndexFromPlayers, TeamMembershipType } from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'badman-team',
  standalone: true,
  imports: [
    CommonModule,

    TranslateModule,

    // Material
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatSelectModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatDividerModule,
    MatTooltipModule,

    // Own
    PlayerSearchComponent,
  ],
  templateUrl: './team.component.html',
  styleUrls: ['./team.component.scss'],
})
export class TeamComponent implements OnInit {
  @Input()
  team!: FormControl<Team>;

  @Input()
  entry!: FormControl<EventEntry>;

  @Input()
  systemId!: string;

  @Output()
  editTeam = new EventEmitter<Team>();

  @Output()
  removeTeam = new EventEmitter<Team>();

  @Output()
  changeTeamNumber = new EventEmitter<Team>();

  types = Object.keys(TeamMembershipType) as TeamMembershipType[];

  expanded = {
    regular: false,
    base: true,
  };

  // easy access to base meta
  get base() {
    return this.entry?.value?.meta?.competition?.players;
  }

  get baseIndex() {
    return this.entry?.value?.meta?.competition?.teamIndex;
  }
  
  baseCount = 0;
  backupCount = 0;
  teamIndex = 0;

  hasWarning = false;
  warningMessage = '';

  constructor(
    private apollo: Apollo,
    private snackbar: MatSnackBar,
    private changeDetector: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.checkTeam();

    if (this.team.value.type && this.team.value.players) {
      this.teamIndex = getIndexFromPlayers(
        this.team.value.type,
        this.team.value.players
      );
    }
  }

  removePlayerFromTeam(player: Player) {
    const newPlayers = this.team.value.players?.filter(
      (p) => p.id !== player.id
    );

    this.team.patchValue({
      ...this.team.value,
      players: newPlayers,
    } as Team);

    this.checkTeam();
  }

  async addPlayerToTeam(player: Player) {
    // Check if player is already in team
    if (this.team.value.players?.find((p) => p.id === player.id)) {
      this.snackbar.open('Player is already in team', 'Close', {
        duration: 3000,
      });
      return;
    }

    const ranking = await this.getRanking(player);

    const newPlayers = this.team.value.players?.concat(
      new TeamPlayer({
        ...player,
        rankingPlaces: ranking.data?.rankingPlaces ?? [],
        membershipType: TeamMembershipType.REGULAR,
      })
    );

    this.team.patchValue({
      ...this.team.value,
      players: newPlayers,
    } as Team);

    this.checkTeam();
  }

  async addBasePlayerToTeam(player: Player) {
    // Check if player is already in team
    if (
      this.entry?.value?.meta?.competition?.players?.find(
        (p) => p.id === player.id
      )
    ) {
      this.snackbar.open('Player is already in baseteam', 'Close', {
        duration: 3000,
      });
      return;
    }

    const ranking = await this.getRanking(player);

    const newPlayers = this.entry?.value?.meta?.competition?.players?.concat({
      player,
      id: player.id,
      single: ranking.data.rankingPlaces?.[0].single,
      double: ranking.data.rankingPlaces?.[0].double,
      mix: ranking.data.rankingPlaces?.[0].mix,
    } as EntryCompetitionPlayers);

    this.entry.patchValue({
      ...this.entry.value,
      meta: {
        ...this.entry.value.meta,
        competition: {
          ...this.entry.value.meta?.competition,
          players: newPlayers,
        },
      },
    } as EventEntry);

    this.checkTeam();
  }

  removeBasePlayerFromTeam(id: string) {
    this.entry.patchValue({
      ...this.entry.value,
      meta: {
        ...this.entry.value.meta,
        competition: {
          ...this.entry.value.meta?.competition,
          players: this.entry?.value?.meta?.competition?.players?.filter(
            (p) => p.id !== id
          ),
        },
      },
    } as EventEntry);

    this.checkTeam();
  }

  changePlayerType(player: TeamPlayer, type: TeamMembershipType) {
    player.membershipType = type;
    this.checkTeam();
  }

  private checkTeam() {
    this.hasWarning = false;
    this.warningMessage = '';

    this.baseCount = this.team.value.players?.filter(
      (p) => p.membershipType === TeamMembershipType.REGULAR
    ).length;

    this.backupCount = this.team.value.players?.filter(
      (p) => p.membershipType === TeamMembershipType.BACKUP
    ).length;

    // calculate index
    if (
      this.entry?.value?.meta?.competition?.players != undefined &&
      this.entry?.value?.meta?.competition?.teamIndex != undefined &&
      this.team?.value?.type
    ) {
      const index = getIndexFromPlayers(
        this.team?.value?.type,
        this.team?.value?.entry?.meta?.competition?.players ?? []
      );

      this.entry.patchValue({
        ...this.entry.value,
        meta: {
          ...this.entry.value.meta,
          competition: {
            ...this.entry.value.meta?.competition,
            teamIndex: index,
          },
        },
      } as EventEntry);
    }

    this.changeDetector.detectChanges();
  }

  private getRanking(player: Player) {
    return lastValueFrom(
      this.apollo.query<{ rankingPlaces: Partial<RankingPlace>[] }>({
        query: gql`
          query PlayerRanking($where: JSONObject!, $order: [SortOrderType!]) {
            rankingPlaces(where: $where, order: $order, take: 1) {
              id
              single
              double
              mix
            }
          }
        `,
        variables: {
          where: {
            playerId: player.id,
            systemId: this.systemId,

            // TODO: we should use the correct date here

            // rankingDate: {
            //   $between: [new Date(season - 1, 0, 1), new Date(season, 0, 1)],
            // },
          },
          order: [
            {
              field: 'rankingDate',
              direction: 'DESC',
            },
          ],
        },
      })
    );
  }
}
