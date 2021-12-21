import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { TranslateService } from '@ngx-translate/core';
import { Game, PlayerGame, RankingSystem } from 'app/_shared';
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

  wonGames: ListGame[] = [];

  lostGamesIgnored: ListGame[] = [];
  lostGamesUpgrade: ListGame[] = [];
  lostGamesDowngrade: ListGame[] = [];

  indexUsedForUpgrade = 0;
  indexUsedForDowngrade = 0;

  gameBreakdown: GameBreakdown[] = [];

  displayedColumns: string[] = ['date', 'team', 'opponent', 'points', 'average-upgrade', 'average-downgrade', 'delete'];

  constructor(private translateService: TranslateService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.calculateAvg();
    this.fillGames();

    if (this.lostGamesIgnored.length == 0) {
      this.formGroup.get('includedIgnored')?.disable();
    }
    if (this.lostGamesUpgrade.length == 0) {
      this.formGroup.get('includedUpgrade')?.disable();
    }
    if (this.lostGamesDowngrade.length == 0) {
      this.formGroup.get('includedDowngrade')?.disable();
    }

    this.formGroup.valueChanges
      .pipe(
        map((value) => {
          return {
            includedIgnored: value.includedIgnored,
            includedUpgrade: value.includedUpgrade,
            includedDowngrade: value.includedDowngrade,
          };
        }, distinctUntilChanged())
      )
      .subscribe(() => {
        this.fillGames();
      });
  }

  calculateAvg() {
    this.wonGames = [];
    this.lostGamesDowngrade = [];
    this.lostGamesUpgrade = [];
    this.lostGamesIgnored = [];

    for (const game of this.games!) {
      const me = game.players!.find((x) => x.id == this.playerId);
      const rankingPoint = game.rankingPoints?.find((x) => x.playerId == this.playerId);

      const teamP1 = game.players?.find((x) => x.team == me!.team && x.player == 1);
      const teamP2 = game.players?.find((x) => x.team == me!.team && x.player == 2);

      const opponentP1 = game.players?.find((x) => x.team !== me!.team && x.player == 1);
      const opponentP2 = game.players?.find((x) => x.team !== me!.team && x.player == 2);

      if ((game.winner == 1 && me?.team == 1) || (game.winner == 2 && me?.team == 2)) {
        if ((rankingPoint?.points ?? 0) > 0) {
          this.wonGames.push({
            game,
            points: rankingPoint!.points!,
            team: [teamP1, teamP2],
            opponent: [opponentP1, opponentP2],
            type: GameBreakdownType.WON,
          });
        }
      } else {
        if (rankingPoint?.differenceInLevel! >= this.system.differenceForDowngrade! * -1) {
          this.lostGamesDowngrade.push({
            game,
            points: undefined,
            team: [teamP1, teamP2],
            opponent: [opponentP1, opponentP2],
            type: GameBreakdownType.LOST_DOWNGRADE,
          });
        } else if (rankingPoint?.differenceInLevel! >= this.system.differenceForUpgrade! * -1) {
          this.lostGamesUpgrade.push({
            game,
            points: undefined,
            team: [teamP1, teamP2],
            opponent: [opponentP1, opponentP2],
            type: GameBreakdownType.LOST_UPGRADE,
          });
        } else {
          this.lostGamesIgnored.push({
            game,
            points: undefined,
            team: [teamP1, teamP2],
            opponent: [opponentP1, opponentP2],
            type: GameBreakdownType.LOST_IGNORED,
          });
        }
      }
    }

    // Sort the games
    this.wonGames = this.wonGames.sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  }

  fillGames() {
    this.gameBreakdown = [];

    if (this.formGroup?.get('includedDowngrade')?.value) {
      this.addLostGames(this.lostGamesDowngrade);
    }

    if (this.formGroup?.get('includedUpgrade')?.value) {
      this.addLostGames(this.lostGamesUpgrade);
    }

    const startingIndex = this.gameBreakdown.length;
    let totalPoints = 0;

    for (var i = 0; i < this.wonGames.length; i++) {
      const { game, points, team, opponent, type } = this.wonGames[i];

      totalPoints += points ?? 0;
      const devideUpgrade = this.lostGamesUpgrade.length + i + 1; // 0 based
      const devideDowngrade = this.lostGamesUpgrade.length + this.lostGamesDowngrade.length + i + 1; // 0 based;

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

  getTooltip(game: GameBreakdown, isForUpgrade: boolean): string {
    let devider = '';

    if (isForUpgrade) {
      devider = `${game.devideUpgradeCorrected}`;
      if (game.devideUpgrade < game.devideUpgradeCorrected) {
        devider += `\n${this.translateService.instant('breakdown.corrected', {
          original: game.devideUpgrade,
          corrected: game.devideUpgradeCorrected,
        })}`;
      }
    } else {
      devider = `${game.devideDowngradeCorrected}`;

      if (game.devideDowngrade < game.devideDowngradeCorrected) {
        devider += `\n${this.translateService.instant('breakdown.corrected', {
          original: game.devideDowngrade,
          corrected: game.devideUpgradeCorrected,
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
  avgUpgrade: number;
  avgDowngrade: number;
  devideUpgradeCorrected: number;
  devideDowngradeCorrected: number;
  devideDowngrade: number;
  devideUpgrade: number;
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
  WON,
  LOST_UPGRADE,
  LOST_DOWNGRADE,
  LOST_IGNORED,
}
