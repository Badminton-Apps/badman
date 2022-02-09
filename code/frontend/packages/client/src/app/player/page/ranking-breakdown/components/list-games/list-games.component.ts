import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { TranslateService } from '@ngx-translate/core';
import { Game, PlayerGame, RankingSystem } from 'app/_shared';
import * as moment from 'moment';
import { Moment } from 'moment';
import { distinctUntilChanged, map } from 'rxjs';
import { AddGameComponent } from '../../dialogs/add-game/add-game.component';

@Component({
  selector: 'app-list-games',
  templateUrl: './list-games.component.html',
  styleUrls: ['./list-games.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListGamesComponent implements OnInit {
  @Input() games!: Game[];
  @Input() system!: RankingSystem;
  @Input() playerId!: string;
  @Input() type!: string;
  @Input() formGroup!: FormGroup;

  dataSource = new MatTableDataSource<GameBreakdown>([]);
  dataSourceRemoved = new MatTableDataSource<Game>([]);

  prevGames?: Game[];
  wonGames: ListGame[] = [];

  lostGamesIgnored: ListGame[] = [];
  lostGamesUpgrade: ListGame[] = [];
  lostGamesDowngrade: ListGame[] = [];
  outOfScopeGames: ListGame[] = [];

  indexUsedForUpgrade = 0;
  indexUsedForDowngrade = 0;

  gameBreakdown: GameBreakdown[] = [];

  displayedColumns: string[] = ['date', 'team', 'opponent', 'points', 'average-upgrade', 'average-downgrade', 'delete'];

  constructor(private translateService: TranslateService, private dialog: MatDialog) {}

  ngOnInit(): void {
    const startPeriod = this.formGroup.get('period')?.get('start')?.value as Moment;

    // Filter out games that are from previous period
    this.prevGames = this.games.filter((x) => moment(x.playedAt).isBefore(startPeriod));
    this.games = this.games.filter((x) => moment(x.playedAt).isSameOrAfter(startPeriod));

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
        }, distinctUntilChanged())
      )
      .subscribe(() => {
        this.fillGames();
      });
  }

  calculateAvg() {
    const gameBreakdown: ListGame[] = [];
    this.games.sort((a, b) => b.playedAt!.getTime() - a.playedAt!.getTime());
    let validGames = 0;

    for (const game of this.games!) {
      const me = game.players!.find((x) => x.id == this.playerId);
      const rankingPoint = game.rankingPoints?.find((x) => x.playerId == this.playerId);

      const teamP1 = game.players?.find((x) => x.team == me!.team && x.player == 1);
      const teamP2 = game.players?.find((x) => x.team == me!.team && x.player == 2);

      const opponentP1 = game.players?.find((x) => x.team !== me!.team && x.player == 1);
      const opponentP2 = game.players?.find((x) => x.team !== me!.team && x.player == 2);

      const type = this.getGameResultType(game);
      const newGameBreakdown = {
        game,
        points: rankingPoint?.points ?? 0,
        team: [teamP1, teamP2],
        opponent: [opponentP1, opponentP2],
        type,
      };

      // Latest x Games to use
      if (this.system.latestXGamesToUse && validGames >= this.system.latestXGamesToUse) {
        newGameBreakdown.type = GameBreakdownType.OUT_SCOPE;
      }
      gameBreakdown.push(newGameBreakdown);

      if (type !== GameBreakdownType.LOST_IGNORED) {
        validGames++;
      }
    }

    // Sort the games
    this.wonGames =
      gameBreakdown.filter((g) => g.type == GameBreakdownType.WON).sort((a, b) => (b.points ?? 0) - (a.points ?? 0)) ??
      [];
    this.lostGamesDowngrade = gameBreakdown.filter((g) => g.type == GameBreakdownType.LOST_DOWNGRADE) ?? [];
    this.lostGamesUpgrade = gameBreakdown.filter((g) => g.type == GameBreakdownType.LOST_UPGRADE) ?? [];
    this.lostGamesIgnored = gameBreakdown.filter((g) => g.type == GameBreakdownType.LOST_IGNORED) ?? [];
    this.outOfScopeGames = gameBreakdown.filter((g) => g.type == GameBreakdownType.OUT_SCOPE) ?? [];
  }

  fillLostGames() {
    const gameBreakdownPrev: any = [];

    for (const game of this.prevGames!) {
      const me = game.players!.find((x) => x.id == this.playerId);
      const rankingPoint = game.rankingPoints?.find((x) => x.playerId == this.playerId);

      const teamP1 = game.players?.find((x) => x.team == me!.team && x.player == 1);
      const teamP2 = game.players?.find((x) => x.team == me!.team && x.player == 2);

      const opponentP1 = game.players?.find((x) => x.team !== me!.team && x.player == 1);
      const opponentP2 = game.players?.find((x) => x.team !== me!.team && x.player == 2);

      const type = this.getGameResultType(game);

      gameBreakdownPrev.push({
        id: game.id!,
        playedAt: game.playedAt,
        team: [teamP1, teamP2],
        opponent: [opponentP1, opponentP2],
        type,
        points: rankingPoint?.points ?? undefined,
      });
    }

    gameBreakdownPrev.sort((a, b) => {
      return a.type - b.type;
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

    for (var i = 0; i < this.wonGames.length; i++) {
      const { game, points, team, opponent, type } = this.wonGames[i];

      totalPoints += points ?? 0;
      const devideUpgrade = this.lostGamesUpgrade.length + this.lostGamesDowngrade.length + i + 1; // 0 based
      const devideDowngrade = this.lostGamesDowngrade.length + i + 1; // 0 based;

      const devideUpgradeCorrected =
        devideUpgrade < this.system.minNumberOfGamesUsedForUpgrade!
          ? this.system.minNumberOfGamesUsedForUpgrade!
          : devideUpgrade;

      const devideDowngradeCorrected =
        devideDowngrade < this.system.minNumberOfGamesUsedForUpgrade!
          ? this.system.minNumberOfGamesUsedForUpgrade!
          : devideDowngrade;

      const avgUpgrade = totalPoints / devideUpgradeCorrected;
      const avgDowngrade = totalPoints / devideDowngradeCorrected;

      if (avgUpgrade > (this.gameBreakdown[this.indexUsedForUpgrade]?.avgUpgrade ?? -1)) {
        this.indexUsedForUpgrade = startingIndex + i;
      }

      if (avgDowngrade > (this.gameBreakdown[this.indexUsedForDowngrade]?.avgDowngrade ?? -1)) {
        this.indexUsedForDowngrade = startingIndex + i;
      }

      this.gameBreakdown.push({
        id: game.id!,
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
        devideDowngradeCorrected,
      });
    }

    if (this.formGroup?.get('includedIgnored')?.value) {
      this.addLostGames(this.lostGamesIgnored);
    }
    this.dataSource.data = this.gameBreakdown;
  }

  private addLostGames(processGames: ListGame[]) {
    for (const { game, team, opponent, type } of processGames) {
      this.gameBreakdown.push({
        id: game.id!,
        playedAt: game.playedAt,
        totalPoints: 0,
        team,
        opponent,
        type,
      } as GameBreakdown);
    }
  }

  private getGameResultType(game: Game) {
    const me = game.players!.find((x) => x.id == this.playerId);
    const rankingPoint = game.rankingPoints?.find((x) => x.playerId == this.playerId);

    if (game.winner == me?.team) {
      return GameBreakdownType.WON;
    } else {
      const upgrade = rankingPoint?.differenceInLevel! >= this.system.differenceForUpgrade! * -1;
      const downgrade = rankingPoint?.differenceInLevel! >= this.system.differenceForDowngrade! * -1;

      if (downgrade) {
        return GameBreakdownType.LOST_DOWNGRADE;
      } else if (upgrade) {
        return GameBreakdownType.LOST_UPGRADE;
      } else {
        return GameBreakdownType.LOST_IGNORED;
      }
    }
  }

  getTooltip(game: GameBreakdown, isForUpgrade: boolean): string {
    let devider = '';

    if (isForUpgrade) {
      devider = `${game.devideUpgradeCorrected}`;
      if (game.devideUpgrade! < game.devideUpgradeCorrected!) {
        devider += `\n${this.translateService.instant('breakdown.corrected', {
          original: game.devideUpgrade,
          corrected: game.devideUpgradeCorrected,
        })}`;
      }
    } else {
      devider = `${game.devideDowngradeCorrected}`;

      if (game.devideDowngrade! < game.devideDowngradeCorrected!) {
        devider += `\n${this.translateService.instant('breakdown.corrected', {
          original: game.devideDowngrade,
          corrected: game.devideDowngradeCorrected,
        })}`;
      }
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
      .subscribe((game: Game) => {
        if (game) {
          this.games.push(game);
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
  totalPoints?: number;
  avgUpgrade?: number;
  avgDowngrade?: number;
  devideUpgradeCorrected?: number;
  devideDowngradeCorrected?: number;
  devideDowngrade?: number;
  devideUpgrade?: number;
  type: GameBreakdownType;
  team: (PlayerGame | undefined)[];
  opponent: (PlayerGame | undefined)[];
}

interface ListGame {
  game: Game;
  points?: number;
  team: (PlayerGame | undefined)[];
  opponent: (PlayerGame | undefined)[];
  type: GameBreakdownType;
}

enum GameBreakdownType {
  WON = 'WON',
  LOST_UPGRADE = 'LOST_UPGRADE',
  LOST_DOWNGRADE = 'LOST_DOWNGRADE',
  LOST_IGNORED = 'LOST_IGNORED',
  OUT_SCOPE = 'OUT_SCOPE',
}
