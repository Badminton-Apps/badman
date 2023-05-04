import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { FormArray, FormBuilder, FormControl } from '@angular/forms';
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
  EntryCompetitionPlayer,
  Player,
  RankingPlace,
  RankingSystem,
  Team,
  TeamPlayer,
} from '@badman/frontend-models';
import {
  TeamMembershipType,
  getCurrentSeason,
  getIndexFromPlayers,
} from '@badman/utils';
import { TranslateModule } from '@ngx-translate/core';
import { Apollo, gql } from 'apollo-angular';
import moment from 'moment';
import { Subject, lastValueFrom, startWith, takeUntil } from 'rxjs';

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
  destroy$ = new Subject<void>();

  @Input()
  team!: FormControl<Team>;

  @Input()
  basePlayers!: FormArray<FormControl<EntryCompetitionPlayer>>;

  @Input()
  system!: RankingSystem;

  @Input()
  season: number = getCurrentSeason();

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

  baseCount = 0;
  backupCount = 0;
  teamIndex = 0;
  baseIndex = 0;

  hasWarning = false;
  warningMessage = '';

  constructor(
    private apollo: Apollo,
    private snackbar: MatSnackBar,
    private changeDetector: ChangeDetectorRef,
    private formBuilder: FormBuilder
  ) {}

  ngOnInit(): void {
    this.checkTeam();

    this.team.valueChanges
      .pipe(takeUntil(this.destroy$), startWith(this.team.value))
      .subscribe(() => {
        if (this.team.value.type && this.team.value.players) {
          this.teamIndex = getIndexFromPlayers(
            this.team.value.type,
            this.team.value.players
          );
        }
      });

    this.basePlayers.valueChanges
      .pipe(takeUntil(this.destroy$), startWith(this.basePlayers.value))
      .subscribe(() => {
        if (this.basePlayers.value && this.team.value.type) {
          this.baseIndex = getIndexFromPlayers(
            this.team.value.type,
            this.basePlayers.value
          );
        }
      });
  }

  removePlayerFromTeam(player: Player) {
    const newPlayers = this.team.value.players?.filter(
      (p) => p.id !== player.id
    );

    this.team.value.players = newPlayers;
    this.team.patchValue(this.team.value);

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

    this.team.value.players = newPlayers;
    this.team.patchValue(this.team.value);

    this.checkTeam();
  }

  async addBasePlayerToTeam(player: Player) {
    // Check if player is already in team
    if (this.basePlayers?.value.find((p) => p.id === player.id)) {
      this.snackbar.open('Player is already in baseteam', 'Close', {
        duration: 3000,
      });
      return;
    }
    const ranking = await this.getRanking(player);
    const newPlayer = {
      player,
      id: player.id,
      single: ranking.data.rankingPlaces?.[0].single,
      double: ranking.data.rankingPlaces?.[0].double,
      mix: ranking.data.rankingPlaces?.[0].mix,
    } as EntryCompetitionPlayer;

    this.basePlayers.push(
      this.formBuilder.control(newPlayer) as FormControl<EntryCompetitionPlayer>
    );

    this.checkTeam();
  }

  removeBasePlayerFromTeam(id: string) {
    const index = this.basePlayers?.value.findIndex((p) => p.id === id);
    this.basePlayers.removeAt(index);
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
            systemId: this.system?.id,

            rankingDate: {
              $lte: moment([this.season, 5, 10]).toISOString(),
            },
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
