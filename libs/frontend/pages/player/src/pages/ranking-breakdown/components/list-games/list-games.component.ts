import { LayoutModule } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  untracked,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Game, GamePlayer, Player, RankingSystem } from '@badman/frontend-models';
import { GameBreakdownType, GameType, getGameResultType } from '@badman/utils';
import { MtxGridColumn, MtxGridModule } from '@ng-matero/extensions/grid';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import moment, { Moment } from 'moment';
import { MomentModule } from 'ngx-moment';
import { derivedAsync } from 'ngxtension/derived-async';
import { RankingBreakdownService } from '../../services/ranking-breakdown.service';
import { MatMenuModule } from '@angular/material/menu';
import * as xlsx from 'xlsx';

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
    MatMenuModule,
    LayoutModule,
    MtxGridModule,
  ],
})
export class ListGamesComponent {
  private translateService = inject(TranslateService);
  readonly breakdownService = inject(RankingBreakdownService);

  games = this.breakdownService.state.games;
  loaded = this.breakdownService.state.loaded;

  private dialog = inject(MatDialog);
  system = input.required<RankingSystem>();
  player = input.required<Player>();
  rankingPlace = computed(() =>
    this.player()?.rankingLastPlaces?.find((x) => x.systemId == this.system().id),
  );

  startPeriod = derivedAsync<Moment>(() => this.breakdownService.filter.get('start')?.valueChanges);
  next = derivedAsync<Moment>(() => this.breakdownService.filter.get('next')?.valueChanges);
  type = derivedAsync<'single' | 'double' | 'mix'>(
    () => this.breakdownService.filter.get('type')?.valueChanges,
  );

  includedIgnored = derivedAsync<boolean | null>(
    () => this.breakdownService.filter.get('includedIgnored')?.valueChanges,
  );
  includedUpgrade = derivedAsync<boolean | null>(
    () => this.breakdownService.filter.get('includedUpgrade')?.valueChanges,
  );
  includedDowngrade = derivedAsync<boolean | null>(
    () => this.breakdownService.filter.get('includedDowngrade')?.valueChanges,
  );
  includeOutOfScopeDowngrade = derivedAsync<boolean | null>(
    () => this.breakdownService.filter.get('includeOutOfScopeDowngrade')?.valueChanges,
  );
  includeOutOfScopeUpgrade = derivedAsync<boolean | null>(
    () => this.breakdownService.filter.get('includeOutOfScopeUpgrade')?.valueChanges,
  );

  includeOutOfScopeWonGames = derivedAsync<boolean | null>(
    () => this.breakdownService.filter.get('includeOutOfScopeWonGames')?.valueChanges,
  );

  currGames = computed(() => {
    if (!this.startPeriod() || !this.player() || !this.system() || this.games().length <= 0) {
      return [];
    }

    console.log('currGames');

    let games: GameBreakdown[] = [];

    untracked(() => {
      games = this.games()
        .filter((x) => moment(x.playedAt).isSameOrAfter(this.startPeriod()))
        .map((x) => x as GameBreakdown);

      this._addBreakdownInfo(games);
      this._determineUsedForRanking(games);
      this._calculateAverageUpgrade(games);
    });

    return games.sort((a, b) => {
      if (a.devideDowngrade && b.devideDowngrade) {
        return a.devideDowngrade - b.devideDowngrade;
      }

      if (a.devideUpgrade && b.devideUpgrade) {
        return a.devideUpgrade - b.devideUpgrade;
      }

      if (a.usedForUpgrade && !b.usedForUpgrade) {
        return -1;
      }

      if (!a.usedForUpgrade && b.usedForUpgrade) {
        return 1;
      }

      if (a.usedForDowngrade && !b.usedForDowngrade) {
        return -1;
      }

      if (!a.usedForDowngrade && b.usedForDowngrade) {
        return 1;
      }

      return 0;
    });
  });

  filterdGames = computed(() => {
    return this.currGames()
      .filter((x) => {
        if (
          this.includeOutOfScopeDowngrade() &&
          x.type == GameBreakdownType.LOST_DOWNGRADE &&
          !x.usedForUpgrade
        ) {
          return true;
        }

        if (
          this.includeOutOfScopeUpgrade() &&
          x.type == GameBreakdownType.LOST_UPGRADE &&
          !x.usedForDowngrade
        ) {
          return true;
        }

        if (this.includedIgnored() && x.type == GameBreakdownType.LOST_IGNORED) {
          return true;
        }

        if (this.includedUpgrade() && x.usedForUpgrade) {
          return true;
        }

        if (this.includedDowngrade() && x.usedForDowngrade) {
          return true;
        }

        if (this.includeOutOfScopeWonGames() && x.type == GameBreakdownType.WON) {
          return true;
        }

        return false;
      })
      ?.map((x, i) => ({ ...x, count: i + 1 }));
  });

  prevGames = computed(() =>
    this.games().filter((x) => moment(x.playedAt).isBefore(this.startPeriod())),
  );

  lostGamesUpgrade = computed(() => this.currGames().filter((x) => x.usedForUpgrade).length);
  lostGamesDowngrade = computed(() => this.currGames().filter((x) => x.usedForDowngrade).length);
  wonGames = computed(() => this.currGames().filter((x) => x.type == GameBreakdownType.WON).length);

  lostGamesIgnored = computed(
    () => this.currGames().filter((x) => x.type == GameBreakdownType.LOST_IGNORED).length,
  );

  outOfScopeGamesUpgrade = computed(
    () =>
      this.currGames().filter(
        (x) => x.type == GameBreakdownType.LOST_UPGRADE && !x.usedForDowngrade,
      ).length,
  );
  outOfScopeGamesDowngrade = computed(
    () =>
      this.currGames().filter(
        (x) => x.type == GameBreakdownType.LOST_DOWNGRADE && !x.usedForUpgrade,
      ).length,
  );

  columns: MtxGridColumn<GameBreakdown>[] = [
    {
      field: 'count',
      header: '#',
      width: '30px',

      formatter: (x) => `${x.count}`,
    },
    {
      width: '50px',
      field: 'dropsNextPeriod',
    },
    {
      header: this.translateService.stream('all.ranking.breakdown.date'),
      field: 'playedAt',
      type: 'date',
      formatter: (x) => moment(x.playedAt).format('llll'),
    },
    {
      header: this.translateService.stream('all.ranking.breakdown.team'),
      field: 'team',
      formatter: (x) => {
        let ranking: 'single' | 'double' | 'mix' = 'single';
        switch (x.gameType) {
          case GameType.S:
            ranking = 'single';
            break;
          case GameType.D:
            ranking = 'double';
            break;

          case GameType.MX:
            ranking = 'mix';
            break;
        }

        return x.team?.map((p) => `${p?.fullName} (${p?.[ranking]})`).join('<br/>');
      },
    },
    {
      header: this.translateService.stream('all.ranking.breakdown.opponent'),
      field: 'opponent',
      formatter: (x) => {
        let ranking: 'single' | 'double' | 'mix' = 'single';
        switch (x.gameType) {
          case GameType.S:
            ranking = 'single';
            break;
          case GameType.D:
            ranking = 'double';
            break;

          case GameType.MX:
            ranking = 'mix';
            break;
        }

        return x.opponent?.map((p) => `${p?.fullName} (${p?.[ranking]})`).join('<br/>');
      },
    },
    { header: this.translateService.stream('all.ranking.breakdown.points'), field: 'points' },
    {
      header: this.translateService.stream('all.ranking.breakdown.used-for-upgrade'),
      field: 'usedForUpgrade',
    },
    {
      header: this.translateService.stream('all.ranking.breakdown.upgrade-average'),
      field: 'avgUpgrade',
      type: 'number',
      formatter: (x) => (x.avgUpgrade ? x.avgUpgrade.toFixed() : ''),
      class: (x) => {
        const classes: string[] = [];

        if (x?.highestAvgUpgrade) {
          classes.push('highest-avg');
        }

        if (x?.canUpgrade) {
          classes.push('upgrade');
        }

        return classes.join(' ');
      },
    },

    {
      header: this.translateService.stream('all.ranking.breakdown.used-for-downgrade'),
      field: 'usedForDowngrade',
    },
    {
      header: this.translateService.stream('all.ranking.breakdown.downgrade-average'),
      field: 'avgDowngrade',
      type: 'number',
      formatter: (x) => (x.avgDowngrade ? x.avgDowngrade.toFixed() : ''),
      class: (x) => {
        const classes: string[] = [];

        if (x?.highestAvgDowngrade) {
          classes.push('highest-avg');
        }

        if (x?.canDowngrade) {
          classes.push('downgrade');
        }

        return classes.join(' ');
      },
    },
  ] as const;

  private _addBreakdownInfo(games: GameBreakdown[]) {
    for (const game of games) {
      const me = game.players?.find((x) => x.id == this.player().id);
      if (!me) {
        throw new Error('Player not found');
      }
      if (!game.gameType) {
        console.warn(`Game ${game.id} has no gameType`);
        throw new Error('Game has no gameType');
      }

      const rankingPoint = game.rankingPoints?.find((x) => x.playerId == this.player().id);

      const type = getGameResultType(game.winner == me.team, game.gameType, {
        differenceInLevel: rankingPoint?.differenceInLevel ?? 0,
        system: this.system(),
      });

      game.points = rankingPoint?.points ?? 0;
      game.type = type;
      game.opponent = game.players?.filter((x) => x.team !== me.team) ?? [];
      game.team = game.players?.filter((x) => x.team == me.team) ?? [];
      game.dropsNextPeriod = moment(game.playedAt).isBefore(this.next());

      // defaults
      game.usedForDowngrade = false;
      game.usedForUpgrade = false;
      game.canUpgrade = false;
      game.canDowngrade = false;
    }
  }

  private _determineUsedForRanking(games: GameBreakdown[]) {
    let validGamesUpgrade = 0;
    let validGamesDowngrade = 0;

    // sort games by playedAt newest first
    for (const game of games.sort((a, b) => {
      if (!a.playedAt || !b.playedAt) {
        return 0;
      }
      return b.playedAt.getTime() - a.playedAt.getTime();
    })) {
      if (game.type == GameBreakdownType.LOST_IGNORED) {
        continue;
      }

      let validUpgrade = false;
      let validDowngrade = false;

      if (game.type == GameBreakdownType.WON) {
        validUpgrade = true;
        validDowngrade = true;
      } else {
        if (game.type == GameBreakdownType.LOST_UPGRADE) {
          validUpgrade = true;
        }

        if (game.type == GameBreakdownType.LOST_DOWNGRADE) {
          validUpgrade = true;
          validDowngrade = true;
        }
      }

      if (validUpgrade && validGamesUpgrade < (this.system()?.latestXGamesToUse ?? Infinity)) {
        validGamesUpgrade++;
        game.usedForUpgrade = true;
      }
      if (validDowngrade && validGamesDowngrade < (this.system()?.latestXGamesToUse ?? Infinity)) {
        validGamesDowngrade++;
        game.usedForDowngrade = true;
      }

      // if both x games are used, the rest of the games are not used
      if (
        validGamesUpgrade >= (this.system()?.latestXGamesToUse ?? Infinity) &&
        validGamesDowngrade >= (this.system()?.latestXGamesToUse ?? Infinity)
      ) {
        break;
      }
    }

    return games;
  }

  private _calculateAverageUpgrade(games: GameBreakdown[]) {
    // sort games if used for donwgrade first
    // then first all 0 points,
    // then highest points first
    // then newest first
    games = games.sort((a, b) => {
      if (a.points == 0 && b.points != 0) {
        return -1;
      }

      if (a.points != 0 && b.points == 0) {
        return 1;
      }

      if (a.points == b.points) {
        return 0;
      }
      return (a.points ?? 0) > (b.points ?? 0) ? -1 : 1;
    });

    // Upgrade
    let totalPointsUpgrade = 0;
    let gamesProssecedUpgrade = 0;
    let workingAvgUpgrade = 0;
    for (const game of games.filter((x) => x.usedForUpgrade)) {
      gamesProssecedUpgrade++;
      game.devideUpgrade = gamesProssecedUpgrade;

      let divider = gamesProssecedUpgrade;
      if (divider < (this.system().minNumberOfGamesUsedForUpgrade ?? 1)) {
        divider = this.system().minNumberOfGamesUsedForUpgrade ?? 1;
      }

      totalPointsUpgrade += game.points ?? 0;
      const avg = totalPointsUpgrade / divider;
      if (avg > workingAvgUpgrade) {
        workingAvgUpgrade = avg;
      }

      game.totalPointsUpgrade = totalPointsUpgrade;
      game.avgUpgrade = workingAvgUpgrade;
      game.devideUpgradeCorrected = divider;
    }

    // Downgrade
    let totalPointsDowngrade = 0;
    let gamesProssecedDowngrade = 0;
    let workingAvgDowngrade = 0;
    for (const game of games.filter((x) => x.usedForDowngrade)) {
      gamesProssecedDowngrade++;
      game.devideDowngrade = gamesProssecedDowngrade;

      let divider = gamesProssecedDowngrade;
      if (divider < (this.system().minNumberOfGamesUsedForDowngrade ?? 1)) {
        divider = this.system().minNumberOfGamesUsedForDowngrade ?? 1;
      }

      totalPointsDowngrade += game.points ?? 0;
      const avg = totalPointsDowngrade / divider;
      if (avg > workingAvgDowngrade) {
        workingAvgDowngrade = avg;
      }

      game.totalPointsDowngrade = totalPointsDowngrade;
      game.avgDowngrade = workingAvgDowngrade;
      game.devideDowngradeCorrected = divider;
    }
    const level = this.rankingPlace()?.[this.type() ?? 'single'] ?? 12;

    // set highest avg for upgrade and downgrade
    for (const game of games) {
      if (game.avgUpgrade == workingAvgUpgrade) {
        game.highestAvgUpgrade = true;
        if (
          workingAvgUpgrade >=
          (this.system().pointsToGoUp?.[(this.system().amountOfLevels ?? 12) - level] ?? 0)
        ) {
          game.canUpgrade = true;
        }
        break;
      }
    }
    for (const game of games) {
      if (game.avgDowngrade == workingAvgDowngrade) {
        game.highestAvgDowngrade = true;
        if (
          workingAvgDowngrade <=
          (this.system().pointsToGoDown?.[(this.system().amountOfLevels ?? 12) - (level + 1)] ?? 0)
        ) {
          game.canDowngrade = true;
        }
        break;
      }
    }

    return games;
  }

  getTooltip(game: GameBreakdown, isForUpgrade: boolean, usedPoints: boolean): string {
    let devider = '';
    let totalPoints = 0;

    if (isForUpgrade) {
      totalPoints = game.totalPointsUpgrade ?? 0;
      devider = `${game.devideUpgradeCorrected}`;
      if ((game.devideUpgrade ?? 0) < (game.devideUpgradeCorrected ?? 0)) {
        devider += `\n\r\n\r${this.translateService.instant('all.ranking.breakdown.corrected', {
          original: game.devideUpgrade,
          corrected: game.devideUpgradeCorrected,
        })}`;
      }
    } else {
      totalPoints = game.totalPointsDowngrade ?? 0;
      devider = `${game.devideDowngrade}`;
    }

    let tooltip = `${totalPoints} / ${devider}`;

    const type = this.type() ?? 'single';

    if (usedPoints) {
      if (isForUpgrade) {
        const level = this.rankingPlace()?.[type] ?? 12;

        tooltip += `\n\r\n\r${this.translateService.instant(
          game.canUpgrade
            ? 'all.ranking.breakdown.can-upgrade'
            : 'all.ranking.breakdown.can-not-upgrade',
          {
            level,
            newLevel: level - 1,
            points: this.system().pointsToGoUp?.[(this.system().amountOfLevels ?? 12) - level],
          },
        )}`;
      } else {
        const level = this.rankingPlace()?.[type] ?? 12;

        tooltip += `\n\r\n\r${this.translateService.instant(
          game.canDowngrade
            ? 'all.ranking.breakdown.can-downgrade'
            : 'all.ranking.breakdown.can-not-downgrade',
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

  addGame() {
    console.log('add game');
  }
  exportToExcel() {
    console.log(this.filterdGames().length);
    const wb = xlsx.utils.book_new();

    const wonTranslation = this.translateService.instant('all.ranking.breakdown.export.WON');
    const lostUpgradeTranslation = this.translateService.instant(
      'all.ranking.breakdown.export.LOST_UPGRADE',
    );
    const lostDowngradeTranslation = this.translateService.instant(
      'all.ranking.breakdown.export.LOST_DOWNGRADE',
    );
    const lostIgnoredTranslation = this.translateService.instant(
      'all.ranking.breakdown.export.LOST_IGNORED',
    );
    const outOfScopeUpgradeTranslation = this.translateService.instant(
      'all.ranking.breakdown.outOfScopeUpgrade',
    );
    const outOfScopeDowngradeTranslation = this.translateService.instant(
      'all.ranking.breakdown.outOfScopeDowngrade',
    );
    const outOfScopeWonTranslation = this.translateService.instant(
      'all.ranking.breakdown.outOfScopeWonGames',
    );

    console.log(lostIgnoredTranslation);

    // Convert JSON data to sheet
    const data = [];
    for (let i = 0; i < this.filterdGames().length; i++) {
      const x = this.filterdGames()[i];
      let countsFor = '';
      switch (x.type) {
        case GameBreakdownType.WON:
          countsFor = wonTranslation;
          break;
        case GameBreakdownType.LOST_UPGRADE:
          countsFor = lostUpgradeTranslation;
          break;
        case GameBreakdownType.LOST_DOWNGRADE:
          countsFor = lostDowngradeTranslation;
          break;
        case GameBreakdownType.LOST_IGNORED:
          countsFor = lostIgnoredTranslation;
          break;
      }

      if (!x.usedForDowngrade && x.type == GameBreakdownType.LOST_DOWNGRADE) {
        countsFor = outOfScopeDowngradeTranslation;
      }

      if (!x.usedForUpgrade && x.type == GameBreakdownType.LOST_UPGRADE) {
        countsFor = outOfScopeUpgradeTranslation;
      }

      if (x.type == GameBreakdownType.WON && !x.usedForUpgrade) {
        countsFor = outOfScopeWonTranslation;
      }

      let type = this.type();
      if (!type) {
        type = 'single';
      }

      data.push({
        'Counts for': countsFor,
        Date: {
          v: x.playedAt,
          t: 'd',
        },
        Player1: `${x.team?.[0]?.fullName} (${x.team?.[0]?.[type] ?? ''})`,
        Player2:
          x.team?.[1]?.fullName != undefined
            ? `${x.team?.[1]?.fullName} (${x.team?.[1]?.[type] ?? ''})`
            : '',
        Opponent1: `${x.opponent?.[0]?.fullName} (${x.opponent?.[0]?.[type] ?? ''})`,
        Opponent2:
          x.opponent?.[1]?.fullName != undefined
            ? `${x.opponent?.[1]?.fullName} (${x.opponent?.[1]?.[type] ?? ''})`
            : '',

        Points: x.points,

        // hidden columns
        usedForUpgrade: {
          v: x.usedForUpgrade,
          t: 'b',
        },
        usedForDowngrade: {
          v: x.usedForDowngrade,
          t: 'b',
        },
        AvgUpgrade: {
          f: `AVERAGEIF(H2:H${i + 2}, TRUE, G2:G${i + 2})`,
          z: '0.00',
        },
        AvgDowngrade: {
          f: `AVERAGEIF(I2:I${i + 2}, TRUE, G2:G${i + 2})`,
          z: '0.00',
        },
      });
    }
    const ws = xlsx.utils.json_to_sheet(data);

    // Define the range of your data (adjust as needed)
    // const dataRange = `A2:A${this.filterdGames().length + 1}`;
    const rows = this.filterdGames().length + 1;

    // count columns where used for upgrade and are tranlsation of won
    const countWon = `COUNTIF(H2:H${rows}, TRUE)`;
    const countLostUpgrade = `COUNTIF(H2:H${rows}, FALSE)`;
    const countLostDowngrade = `COUNTIF(I2:I${rows}, TRUE)`;

    // get highest avg upgrade and downgrade
    const avgUpgradeFormula = `MAX(J2:J${rows})`;
    const avgDowngradeFormula = `MAX(K2:K${rows})`;

    // add 2 empty rows
    xlsx.utils.sheet_add_aoa(ws, [['', '', '', '', '', '', '']], {
      origin: 'A',
    });
    xlsx.utils.sheet_add_aoa(ws, [['', '', '', '', '', '', '']], {
      origin: 'A',
    });

    // Add calculated averages to the sheet
    xlsx.utils.sheet_add_aoa(ws, [['', '', '', '', '', '', 'Avg. Upgrade', 'Avg. Downgrade']], {
      origin: 'A',
    });
    xlsx.utils.sheet_add_aoa(
      ws,
      [
        [
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          { f: avgUpgradeFormula },
          { f: avgDowngradeFormula },
        ],
      ],
      {
        origin: 'A',
      },
    );

    // debug line

    xlsx.utils.sheet_add_aoa(
      ws,
      [
        [
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          { f: `=${countLostUpgrade}` },
          { f: `=${countLostDowngrade}` },
          { f: `=${countWon}` },
        ],
      ],
      {
        origin: 'A',
      },
    );
    // apply filter on the data range
    ws['!autofilter'] = { ref: `A1:I${this.filterdGames().length + 1}` };

    // Append sheet to workbook
    xlsx.utils.book_append_sheet(wb, ws, 'Games');

    // Save the workbook
    const end = moment(this.breakdownService.filter.get('period')?.get('end')?.value).format(
      'YYYY-MM-DD',
    );
    xlsx.writeFile(wb, `ranking-breakdown-${this.player()?.fullName}-${end}.xlsx`);
  }
}

interface GameBreakdown extends Game {
  points?: number;
  dropsNextPeriod?: boolean;

  totalPointsUpgrade?: number;
  totalPointsDowngrade?: number;

  avgUpgrade?: number;
  highestAvgUpgrade?: boolean;

  avgDowngrade?: number;
  highestAvgDowngrade?: boolean;

  canUpgrade?: boolean;
  canDowngrade?: boolean;

  devideUpgradeCorrected?: number;
  devideDowngradeCorrected?: number;
  devideDowngrade?: number;
  devideUpgrade?: number;

  usedForUpgrade?: boolean;
  usedForDowngrade?: boolean;
  type: GameBreakdownType;
  team: (GamePlayer | undefined)[];
  opponent: (GamePlayer | undefined)[];
  count: number;
}
