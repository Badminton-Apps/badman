import { BreakpointObserver, Breakpoints, LayoutModule } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  computed,
  input,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Game, GamePlayer, Player, RankingSystem } from '@badman/frontend-models';
import { GameBreakdownType, GameStatus, getGameResultType } from '@badman/utils';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import moment, { Moment } from 'moment';
import { MomentModule } from 'ngx-moment';
import { injectDestroy } from 'ngxtension/inject-destroy';
import { distinctUntilChanged, map, takeUntil } from 'rxjs';
import { AddGameComponent } from '../../dialogs/add-game';

@Component({
  selector: 'badman-list-games',
  templateUrl: './list-games.component.html',
  styleUrls: ['./list-games.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,
    MomentModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTableModule,
    MatTooltipModule,
    MatButtonModule,
    LayoutModule,
  ],
})
export class ListGamesComponent implements OnInit {
  private destroy$ = injectDestroy();

  games = input<Game[]>([]);
  system = input.required<RankingSystem>();
  player = input.required<Player>();
  formGroup = input.required<FormGroup>();

  dataSource = new MatTableDataSource<GameBreakdown>([]);
  dataSourceRemoved = new MatTableDataSource<Game>([]);

  playerId = computed(() => this.player()?.id);
  rankingPlace = computed(() =>
    this.player()?.rankingLastPlaces?.find((x) => x.systemId == this.system().id),
  );

  type!: 'single' | 'double' | 'mix';

  startPeriod = computed(() => this.formGroup()?.get('period')?.get('start')?.value as Moment);
  prevGames = computed(() =>
    this.games().filter((x) => moment(x.playedAt).isBefore(this.startPeriod())),
  );
  currGames = computed(() =>
    this.games().filter((x) => moment(x.playedAt).isSameOrAfter(this.startPeriod())),
  );

  wonGames: ListGame[] = [];

  lostGamesIgnored: ListGame[] = [];
  lostGamesUpgrade: ListGame[] = [];
  lostGamesDowngrade: ListGame[] = [];
  outOfScopeGames: ListGame[] = [];

  indexUsedForUpgrade = 0;
  indexUsedForDowngrade = 0;
  canUpgrade = false;
  canDowngrade = false;

  gameBreakdown: GameBreakdown[] = [];

  displayedColumns: string[] = [
    'count',
    'dropsNextPeriod',
    'date',
    'team',
    'opponent',
    'points',
    'average-upgrade',
    'average-downgrade',
    'delete',
  ];

  dateFormat?: string;
  displayNameMap = new Map([
    [Breakpoints.XSmall, 'DD MMM YY'],
    [Breakpoints.Small, 'DD MMM YY'],
    [Breakpoints.Medium, 'll'],
    [Breakpoints.Large, 'lll'],
    [Breakpoints.XLarge, 'lll'],
  ]);

  constructor(
    private translateService: TranslateService,
    breakpointObserver: BreakpointObserver,
    changeDetectorRef: ChangeDetectorRef,
    private dialog: MatDialog,
  ) {
    breakpointObserver
      .observe([
        Breakpoints.XSmall,
        Breakpoints.Small,
        Breakpoints.Medium,
        Breakpoints.Large,
        Breakpoints.XLarge,
      ])
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        for (const query of Object.keys(result.breakpoints)) {
          if (result.breakpoints[query]) {
            this.dateFormat = this.displayNameMap.get(query) ?? 'll';
            changeDetectorRef.markForCheck();
          }
        }
      });
  }

  ngOnInit(): void {
    this.type = this.formGroup()?.get('gameType')?.value;

    this.calculateAvg();
    this.fillGames();
    this.fillLostGames();

    this.formGroup()
      ?.valueChanges.pipe(
        map((value) => {
          return {
            includedIgnored: value.includedIgnored,
            includedUpgrade: value.includedUpgrade,
            includedDowngrade: value.includedDowngrade,
            includeOutOfScope: value.includeOutOfScope,
          };
        }, distinctUntilChanged()),
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.fillGames();
      });
  }

  calculateAvg() {
    const gameBreakdown: ListGame[] = [];
    this.currGames().sort((a, b) => {
      if (!a.playedAt || !b.playedAt) {
        return 0;
      }
      return b.playedAt.getTime() - a.playedAt.getTime();
    });
    let validGames = 0;

    for (const game of this.currGames()) {
      if (game.status !== GameStatus.NORMAL) {
        continue;
      }

      const me = game.players?.find((x) => x.id == this.playerId());
      if (!me) {
        throw new Error('Player not found');
      }
      if (!game.gameType) {
        console.warn(`Game ${game.id} has no gameType`);
        continue;
      }

      const rankingPoint = game.rankingPoints?.find((x) => x.playerId == this.playerId());

      const teamP1 = game.players?.find((x) => x.team == me.team && x.player == 1);
      const teamP2 = game.players?.find((x) => x.team == me.team && x.player == 2);

      const opponentP1 = game.players?.find((x) => x.team !== me.team && x.player == 1);
      const opponentP2 = game.players?.find((x) => x.team !== me.team && x.player == 2);

      const type = getGameResultType(game.winner == me.team, game.gameType, {
        differenceInLevel: rankingPoint?.differenceInLevel ?? 0,
        system: this.system(),
      });
      const newGameBreakdown = {
        game,
        points: rankingPoint?.points ?? 0,
        team: [teamP1, teamP2],
        opponent: [opponentP1, opponentP2],
        type,
      };

      // Latest x Games to use
      if (this.system().latestXGamesToUse && validGames >= this.system().latestXGamesToUse!) {
        newGameBreakdown.type = GameBreakdownType.OUT_SCOPE;
      }
      gameBreakdown.push(newGameBreakdown);

      if (type !== GameBreakdownType.LOST_IGNORED) {
        validGames++;
      }
    }

    // Sort the games
    this.wonGames =
      gameBreakdown
        .filter((g) => g.type == GameBreakdownType.WON)
        .sort((a, b) => (b.points ?? 0) - (a.points ?? 0)) ?? [];
    this.lostGamesDowngrade =
      gameBreakdown.filter((g) => g.type == GameBreakdownType.LOST_DOWNGRADE) ?? [];
    this.lostGamesUpgrade =
      gameBreakdown.filter((g) => g.type == GameBreakdownType.LOST_UPGRADE) ?? [];
    this.lostGamesIgnored =
      gameBreakdown.filter((g) => g.type == GameBreakdownType.LOST_IGNORED) ?? [];
    this.outOfScopeGames = gameBreakdown.filter((g) => g.type == GameBreakdownType.OUT_SCOPE) ?? [];
  }

  fillLostGames() {
    const gameBreakdownPrev: {
      id: string;
      playedAt?: Date;
      team: (GamePlayer | undefined)[];
      opponent: (GamePlayer | undefined)[];
      type: GameBreakdownType;
      points: number | undefined;
    }[] = [];

    for (const game of this.prevGames()) {
      if (!game?.id) {
        throw new Error('Game not found');
      }
      const me = game.players?.find((x) => x.id == this.playerId());
      if (!me) {
        throw new Error('Player not found');
      }
      if (!game.gameType) {
        console.warn(`Game ${game.id} has no gameType`);
        continue;
      }

      const rankingPoint = game.rankingPoints?.find((x) => x.playerId == this.playerId());

      const teamP1 = game.players?.find((x) => x.team == me.team && x.player == 1);
      const teamP2 = game.players?.find((x) => x.team == me.team && x.player == 2);

      const opponentP1 = game.players?.find((x) => x.team !== me.team && x.player == 1);
      const opponentP2 = game.players?.find((x) => x.team !== me.team && x.player == 2);

      const type = getGameResultType(game.winner == me.team, game.gameType, {
        differenceInLevel: rankingPoint?.differenceInLevel ?? 0,
        system: this.system(),
      });

      gameBreakdownPrev.push({
        id: game.id,
        playedAt: game.playedAt,
        team: [teamP1, teamP2],
        opponent: [opponentP1, opponentP2],
        type,
        points: rankingPoint?.points ?? undefined,
      });
    }

    gameBreakdownPrev.sort((a, b) => {
      return a.type.localeCompare(b.type);
    });

    this.dataSourceRemoved.data = gameBreakdownPrev;
  }

  fillGames() {
    this.gameBreakdown = [];

    if (this.formGroup()?.get('includeOutOfScope')?.value) {
      this.addLostGames(this.outOfScopeGames);
    }

    if (this.formGroup()?.get('includedUpgrade')?.value) {
      this.addLostGames(this.lostGamesUpgrade);
    }

    if (this.formGroup()?.get('includedDowngrade')?.value) {
      this.addLostGames(this.lostGamesDowngrade);
    }

    const startingIndex = this.gameBreakdown.length;
    let totalPoints = 0;

    for (let i = 0; i < this.wonGames.length; i++) {
      const { game, points, team, opponent, type } = this.wonGames[i];
      if (!game?.id) {
        throw new Error('Game not found');
      }

      totalPoints += points ?? 0;
      const devideUpgrade = this.lostGamesUpgrade.length + this.lostGamesDowngrade.length + i + 1; // 0 based
      const devideDowngrade = this.lostGamesDowngrade.length + i + 1; // 0 based;

      const devideUpgradeCorrected =
        devideUpgrade < (this.system().minNumberOfGamesUsedForUpgrade ?? 0)
          ? this.system().minNumberOfGamesUsedForUpgrade ?? 0
          : devideUpgrade;

      const devideDowngradeCorrected =
        devideDowngrade < (this.system().minNumberOfGamesUsedForDowngrade ?? 0)
          ? this.system().minNumberOfGamesUsedForDowngrade ?? 0
          : devideDowngrade;

      const avgUpgrade = Math.round(totalPoints / devideUpgradeCorrected);
      const avgDowngrade = Math.round(totalPoints / devideDowngradeCorrected);

      if (avgUpgrade > (this.gameBreakdown[this.indexUsedForUpgrade]?.avgUpgrade ?? -1)) {
        this.indexUsedForUpgrade = startingIndex + i;
      }

      if (avgDowngrade > (this.gameBreakdown[this.indexUsedForDowngrade]?.avgDowngrade ?? -1)) {
        this.indexUsedForDowngrade = startingIndex + i;
      }

      // decide if the player is going to upgrade

      this.gameBreakdown.push({
        id: game.id,
        playedAt: game.playedAt,
        totalPoints,
        team,
        opponent,
        type,
        points,
        avgUpgrade,
        avgDowngrade,
        devideDowngrade,
        devideUpgrade,
        devideUpgradeCorrected,
      });
    }

    if (this.formGroup()?.get('includedIgnored')?.value) {
      this.addLostGames(this.lostGamesIgnored);
    }

    // mark all games that would dissapear  next period
    const nextPeriod = this.formGroup()?.get('period')?.get('next')?.value as Moment;
    this.gameBreakdown = this.gameBreakdown?.map((x) => ({
      ...x,
      dropsNextPeriod: moment(x.playedAt).isBefore(nextPeriod),
    }));

    this.dataSource.data = this.gameBreakdown;
    this.canUpgradeOrDowngrade();
  }

  canUpgradeOrDowngrade() {
    if (this.rankingPlace()) {
      const level = this.rankingPlace()?.[this.type] ?? 12;

      const nextLevel = this.system().pointsToGoUp?.[(this.system().amountOfLevels ?? 12) - level];

      const prevLevel =
        this.system().pointsToGoDown?.[(this.system().amountOfLevels ?? 12) - (level + 1)];

      const upgradePoints = this.gameBreakdown[this.indexUsedForUpgrade]?.avgUpgrade ?? 0;

      const downgradePoints = this.gameBreakdown[this.indexUsedForDowngrade]?.avgDowngrade ?? 0;

      this.canUpgrade = upgradePoints >= (nextLevel ?? 0);
      this.canDowngrade = downgradePoints <= (prevLevel ?? 0);

      // console.log(
      //   `Upgrade ${level} -> ${level - 1}: ${upgradePoints} >= ${nextLevel} = ${
      //     this.canUpgrade
      //   }`,
      // );
      // console.log(
      //   `Downgrade ${level} -> ${
      //     level + 1
      //   }: ${downgradePoints} <= ${prevLevel} = ${this.canDowngrade}`,
      // );
    }
  }

  private addLostGames(processGames: ListGame[]) {
    for (const { game, team, opponent, type } of processGames) {
      this.gameBreakdown.push({
        id: game.id,
        playedAt: game.playedAt,
        totalPoints: 0,
        team,
        opponent,
        type,
      } as GameBreakdown);
    }
  }

  getTooltip(game: GameBreakdown, isForUpgrade: boolean, usedPoints: boolean): string {
    let devider = '';

    if (isForUpgrade) {
      devider = `${game.devideUpgradeCorrected}`;
      if ((game.devideUpgrade ?? 0) < (game.devideUpgradeCorrected ?? 0)) {
        devider += `\n\r\n\r${this.translateService.instant('all.ranking.breakdown.corrected', {
          original: game.devideUpgrade,
          corrected: game.devideUpgradeCorrected,
        })}`;
      }
    } else {
      devider = `${game.devideDowngrade}`;
    }

    let tooltip = `${game.totalPoints?.toLocaleString()} / ${devider}`;

    if (usedPoints) {
      if (isForUpgrade) {
        const level = this.rankingPlace()?.[this.type] ?? 12;

        tooltip += `\n\r\n\r${this.translateService.instant(
          this.canUpgrade ? 'all.ranking.breakdown.can-upgrade' : 'all.ranking.breakdown.can-not-upgrade',
          {
            level,
            newLevel: level - 1,
            points: this.system().pointsToGoUp?.[(this.system().amountOfLevels ?? 12) - level],
          },
        )}`;
      } else {
        const level = this.rankingPlace()?.[this.type] ?? 12;

        tooltip += `\n\r\n\r${this.translateService.instant(
          this.canDowngrade ? 'all.ranking.breakdown.can-downgrade' : 'all.ranking.breakdown.can-not-downgrade',
          {
            level,
            newLevel: level + 1,
            points:
              this.system().pointsToGoDown?.[(this.system().amountOfLevels ?? 12) - (level + 1)],
          },
        )}`;
      }
    }

    return tooltip;
  }

  deleteGame(game: GameBreakdown) {
    const index = this.currGames().findIndex((x) => x.id == game.id);
    if (index != -1) {
      this.currGames().splice(index, 1);
    }
    this.calculateAvg();
    this.fillGames();
  }

  addGame() {
    this.dialog
      .open(AddGameComponent, {
        minWidth: '450px',
        data: {
          playerId: this.playerId(),
          type: this.type,
          system: this.system(),
        },
      })
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((game: Game) => {
        if (game) {
          this.currGames().push(game);
          this.calculateAvg();
          this.fillGames();
        }
      });
  }
}

interface GameBreakdown {
  id: string;
  playedAt?: Date;
  points?: number;
  dropsNextPeriod?: boolean;
  totalPoints?: number;
  avgUpgrade?: number;
  avgDowngrade?: number;
  devideUpgradeCorrected?: number;
  devideDowngradeCorrected?: number;
  devideDowngrade?: number;
  devideUpgrade?: number;
  type: GameBreakdownType;
  team: (GamePlayer | undefined)[];
  opponent: (GamePlayer | undefined)[];
}

interface ListGame {
  game: Game;
  points?: number;
  team: (GamePlayer | undefined)[];
  opponent: (GamePlayer | undefined)[];
  type: GameBreakdownType;
}
