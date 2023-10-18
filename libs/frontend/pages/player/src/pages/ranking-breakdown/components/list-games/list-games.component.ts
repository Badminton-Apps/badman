import {
  BreakpointObserver,
  Breakpoints,
  LayoutModule,
} from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Game, GamePlayer, RankingSystem } from '@badman/frontend-models';
import {
  GameBreakdownType,
  GameStatus,
  getGameResultType,
} from '@badman/utils';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import moment, { Moment } from 'moment';
import { MomentModule } from 'ngx-moment';
import { distinctUntilChanged, map, Subject, takeUntil } from 'rxjs';
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

    // Material
    MatIconModule,
    MatSlideToggleModule,
    MatTableModule,
    MatTooltipModule,
    MatButtonModule,
    LayoutModule,
  ],
})
export class ListGamesComponent implements OnInit, OnDestroy {
  @Input() games!: Game[];
  @Input() system!: RankingSystem;
  @Input() playerId!: string;
  @Input() formGroup!: FormGroup;

  destroyed = new Subject<void>();
  dataSource = new MatTableDataSource<GameBreakdown>([]);
  dataSourceRemoved = new MatTableDataSource<Game>([]);

  type!: string;
  prevGames?: Game[];
  wonGames: ListGame[] = [];

  lostGamesIgnored: ListGame[] = [];
  lostGamesUpgrade: ListGame[] = [];
  lostGamesDowngrade: ListGame[] = [];
  outOfScopeGames: ListGame[] = [];

  indexUsedForUpgrade = 0;
  indexUsedForDowngrade = 0;

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
      .pipe(takeUntil(this.destroyed))
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
    const startPeriod = this.formGroup.get('period')?.get('start')
      ?.value as Moment;

    // Filter out games that are from previous period
    this.prevGames = this.games.filter((x) =>
      moment(x.playedAt).isBefore(startPeriod),
    );
    this.games = this.games.filter((x) =>
      moment(x.playedAt).isSameOrAfter(startPeriod),
    );

    this.type = this.formGroup.get('gameType')?.value;

    this.calculateAvg();
    this.fillGames();
    this.fillLostGames();

    this.formGroup.valueChanges
      .pipe(
        map((value) => {
          return {
            includedIgnored: value.includedIgnored,
            includedUpgrade: value.includedUpgrade,
            includedDowngrade: value.includedDowngrade,
            includeOutOfScope: value.includeOutOfScope,
          };
        }, distinctUntilChanged()),
      )
      .pipe(takeUntil(this.destroyed))
      .subscribe(() => {
        this.fillGames();
      });
  }

  calculateAvg() {
    const gameBreakdown: ListGame[] = [];
    this.games.sort((a, b) => {
      if (!a.playedAt || !b.playedAt) {
        return 0;
      }
      return b.playedAt.getTime() - a.playedAt.getTime();
    });
    let validGames = 0;

    for (const game of this.games) {
      if (game.status !== GameStatus.NORMAL) {
        continue;
      }

      const me = game.players?.find((x) => x.id == this.playerId);
      if (!me) {
        throw new Error('Player not found');
      }

      const rankingPoint = game.rankingPoints?.find(
        (x) => x.playerId == this.playerId,
      );

      const teamP1 = game.players?.find(
        (x) => x.team == me.team && x.player == 1,
      );
      const teamP2 = game.players?.find(
        (x) => x.team == me.team && x.player == 2,
      );

      const opponentP1 = game.players?.find(
        (x) => x.team !== me.team && x.player == 1,
      );
      const opponentP2 = game.players?.find(
        (x) => x.team !== me.team && x.player == 2,
      );

      const type = getGameResultType(game.winner == me.team, {
        differenceInLevel: rankingPoint?.differenceInLevel ?? 0,
        system: this.system,
      });
      const newGameBreakdown = {
        game,
        points: rankingPoint?.points ?? 0,
        team: [teamP1, teamP2],
        opponent: [opponentP1, opponentP2],
        type,
      };

      // Latest x Games to use
      if (
        this.system.latestXGamesToUse &&
        validGames >= this.system.latestXGamesToUse
      ) {
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
      gameBreakdown.filter((g) => g.type == GameBreakdownType.LOST_DOWNGRADE) ??
      [];
    this.lostGamesUpgrade =
      gameBreakdown.filter((g) => g.type == GameBreakdownType.LOST_UPGRADE) ??
      [];
    this.lostGamesIgnored =
      gameBreakdown.filter((g) => g.type == GameBreakdownType.LOST_IGNORED) ??
      [];
    this.outOfScopeGames =
      gameBreakdown.filter((g) => g.type == GameBreakdownType.OUT_SCOPE) ?? [];
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

    for (const game of this.prevGames ?? []) {
      if (!game?.id) {
        throw new Error('Game not found');
      }
      const me = game.players?.find((x) => x.id == this.playerId);
      if (!me) {
        throw new Error('Player not found');
      }

      const rankingPoint = game.rankingPoints?.find(
        (x) => x.playerId == this.playerId,
      );

      const teamP1 = game.players?.find(
        (x) => x.team == me.team && x.player == 1,
      );
      const teamP2 = game.players?.find(
        (x) => x.team == me.team && x.player == 2,
      );

      const opponentP1 = game.players?.find(
        (x) => x.team !== me.team && x.player == 1,
      );
      const opponentP2 = game.players?.find(
        (x) => x.team !== me.team && x.player == 2,
      );

      const type = getGameResultType(game.winner == me.team, {
        differenceInLevel: rankingPoint?.differenceInLevel ?? 0,
        system: this.system,
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

    if (this.formGroup?.get('includeOutOfScope')?.value) {
      this.addLostGames(this.outOfScopeGames);
    }

    if (this.formGroup?.get('includedUpgrade')?.value) {
      this.addLostGames(this.lostGamesUpgrade);
    }

    if (this.formGroup?.get('includedDowngrade')?.value) {
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
      const devideUpgrade =
        this.lostGamesUpgrade.length + this.lostGamesDowngrade.length + i + 1; // 0 based
      const devideDowngrade = this.lostGamesDowngrade.length + i + 1; // 0 based;

      const devideUpgradeCorrected =
        devideUpgrade < (this.system.minNumberOfGamesUsedForUpgrade ?? 0)
          ? this.system.minNumberOfGamesUsedForUpgrade ?? 0
          : devideUpgrade;

      const devideDowngradeCorrected =
        devideDowngrade < (this.system.minNumberOfGamesUsedForDowngrade ?? 0)
          ? this.system.minNumberOfGamesUsedForDowngrade ?? 0
          : devideDowngrade;

      const avgUpgrade = Math.round(totalPoints / devideUpgradeCorrected);
      const avgDowngrade = Math.round(totalPoints / devideDowngradeCorrected);

      if (
        avgUpgrade >
        (this.gameBreakdown[this.indexUsedForUpgrade]?.avgUpgrade ?? -1)
      ) {
        this.indexUsedForUpgrade = startingIndex + i;
      }

      if (
        avgDowngrade >
        (this.gameBreakdown[this.indexUsedForDowngrade]?.avgDowngrade ?? -1)
      ) {
        this.indexUsedForDowngrade = startingIndex + i;
      }

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

    if (this.formGroup?.get('includedIgnored')?.value) {
      this.addLostGames(this.lostGamesIgnored);
    }

    // mark all games that would dissapear  next period
    const nextPeriod = this.formGroup.get('period')?.get('next')
      ?.value as Moment;
    this.gameBreakdown = this.gameBreakdown?.map((x) => ({
      ...x,
      dropsNextPeriod: moment(x.playedAt).isBefore(nextPeriod),
    }));

    this.dataSource.data = this.gameBreakdown;
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

  getTooltip(game: GameBreakdown, isForUpgrade: boolean): string {
    let devider = '';

    if (isForUpgrade) {
      devider = `${game.devideUpgradeCorrected}`;
      if ((game.devideUpgrade ?? 0) < (game.devideUpgradeCorrected ?? 0)) {
        devider += `\n${this.translateService.instant(
          'all.breakdown.corrected',
          {
            original: game.devideUpgrade,
            corrected: game.devideUpgradeCorrected,
          },
        )}`;
      }
    } else {
      devider = `${game.devideDowngrade}`;
    }

    return `${game.totalPoints} / ${devider}`;
  }

  deleteGame(game: GameBreakdown) {
    const index = this.games.findIndex((x) => x.id == game.id);
    if (index != -1) {
      this.games.splice(index, 1);
    }
    this.calculateAvg();
    this.fillGames();
  }

  addGame() {
    this.dialog
      .open(AddGameComponent, {
        minWidth: '450px',
        data: {
          playerId: this.playerId,
          type: this.type,
          system: this.system,
        },
      })
      .afterClosed()
      .pipe(takeUntil(this.destroyed))
      .subscribe((game: Game) => {
        if (game) {
          this.games.push(game);
          this.calculateAvg();
          this.fillGames();
        }
      });
  }

  ngOnDestroy() {
    this.destroyed.next();
    this.destroyed.complete();
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
