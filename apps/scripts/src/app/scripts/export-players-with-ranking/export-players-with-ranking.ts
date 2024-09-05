import { Game, Player, RankingPlace, RankingPoint, RankingSystem } from '@badman/backend-database';
import { GameBreakdownType, GameType, getGameResultType } from '@badman/utils';
import { Injectable, Logger } from '@nestjs/common';
import moment from 'moment';
import { Op } from 'sequelize';
import xlsx from 'xlsx';

@Injectable()
export class ExportPlayersWithRanking {
  private readonly logger = new Logger(ExportPlayersWithRanking.name);

  public async process() {
    const primarySystem = await RankingSystem.findOne({
      where: {
        primary: true,
      },
    });

    const players = await Player.findAll({
      attributes: ['id', 'firstName', 'lastName', 'memberId', 'gender'],
      where: {
        competitionPlayer: true,
        // memberId: '50104197',
        // memberId: '50072145',
      },
      include: [
        {
          attributes: [
            'id',
            'single',
            'double',
            'mix',
            'singlePoints',
            'doublePoints',
            'mixPoints',
            'rankingDate',
            'systemId',
          ],
          model: RankingPlace,
          where: {
            systemId: primarySystem.id,
          rankingDate: {
              [Op.in]: ['2024-09-02', '2024-08-12'],
            },
          },
        },
      ],
      order: [
        ['lastName', 'ASC'],
        ['firstName', 'ASC'],
      ],
    });

    // write players with ranking to excel
    const wb = xlsx.utils.book_new();

    const singles = await this.mapData(players, primarySystem, 'single');
    const ws = xlsx.utils.json_to_sheet(singles);
    xlsx.utils.book_append_sheet(wb, ws, 'Singles');

    const doubles = await this.mapData(players, primarySystem, 'double');
    const ws2 = xlsx.utils.json_to_sheet(doubles);
    xlsx.utils.book_append_sheet(wb, ws2, 'Doubles');

    const mix = await this.mapData(players, primarySystem, 'mix');
    const ws3 = xlsx.utils.json_to_sheet(mix);
    xlsx.utils.book_append_sheet(wb, ws3, 'Mix');

    xlsx.writeFile(wb, 'players-with-ranking.xlsx');
  }

  private async mapData(
    players: Player[],
    system: RankingSystem,
    type: 'single' | 'double' | 'mix',
  ) {
    this.logger.debug(`Mapping ${players.length} data for ${type}`);
    const data = [];
    for (const player of players) {
      const rankingSep = player.rankingPlaces.find(
        (rp) => rp.systemId === system.id && moment(rp.rankingDate).isSame('2024-09-12', 'day'),
      );

      const rankingAug = player.rankingPlaces.find(
        (rp) => rp.systemId === system.id && moment(rp.rankingDate).isSame('2024-08-01', 'day'),
      );

      const averages = await this.calcaulateAverages(
        player,
        system,
        type,
        '2024-09-02',
        rankingSep,
      );

      const pointsNeededForPromotion =
        system.pointsToGoUp[system.pointsToGoUp.length + 1 - (rankingAug?.[type] ?? 0)];
      const pointsNeededForDowngrade =
        system.pointsToGoDown[system.pointsToGoDown.length - (rankingAug?.[type] ?? 0)];

      const shouldHaveGoneUp =
        rankingSep?.[type + 'Points'] > pointsNeededForPromotion &&
        rankingAug?.[type] == rankingSep?.[type];

      let shouldHaveGoneDown =
        averages.avgDowngrade < pointsNeededForDowngrade &&
        rankingAug?.[type] == rankingSep?.[type];

      shouldHaveGoneDown = this.validateShouldHaveGoneDown(
        shouldHaveGoneDown,
        type,
        rankingAug,
        system,
      );

      data.push({
        Name: player.fullName,
        Number: player.memberId,
        Gender: player.gender,
        ['Ranking sep']: rankingSep?.[type],
        ['Ranking aug']: rankingAug?.[type],
        ['Points upgrade']: rankingSep?.[type + 'Points'],
        ['Points downgrade']: averages.avgDowngrade ? Math.round(averages.avgDowngrade) : '',
        ['Points needed']: pointsNeededForPromotion,
        ['Should have gone up']: shouldHaveGoneUp ? 'Yes' : 'No',
        ['Points needed downgrade']: pointsNeededForDowngrade,
        ['Should have gone down']: shouldHaveGoneDown ? 'Yes' : 'No',
      });
    }
    return data;
  }

  private validateShouldHaveGoneDown(
    shouldHaveGoneDown: boolean,
    type: string,
    rankingJul: RankingPlace,
    system: RankingSystem,
  ) {
    if (shouldHaveGoneDown) {
      const ranking = Math.min(rankingJul?.[type] + 1, system.amountOfLevels);

      if (type !== 'single') {
        if (ranking - (rankingJul?.single ?? 0) > system.maxDiffLevels) {
          return false;
        }
      }
      if (type !== 'double') {
        if (ranking - (rankingJul?.double ?? 0) > system.maxDiffLevels) {
          return false;
        }
      }
      if (type !== 'mix') {
        if (ranking - (rankingJul?.mix ?? 0) > system.maxDiffLevels) {
          return false;
        }
      }
    }
    return shouldHaveGoneDown;
  }

  private async calcaulateAverages(
    player: Player,
    system: RankingSystem,
    type: 'single' | 'double' | 'mix',
    calcDate: string,
    rankingPlace: RankingPlace,
  ) {
    const g = await player.getGames({
      where: {
        gameType: type == 'single' ? GameType.S : type == 'double' ? GameType.D : GameType.MX,
        playedAt: {
          [Op.lte]: calcDate,
          [Op.gt]: moment(calcDate)
            .subtract(system.periodAmount, system.periodUnit)
            .format('YYYY-MM-DD'),
        },
      },
      include: [
        { model: RankingPoint, where: { systemId: system.id } },
        {
          model: Player,
        },
      ],
    });

    if (g.length == 0) {
      return {
        avgUpgrade: 0,
        avgDowngrade: 0,
      };
    }

    const games = g.map(
      (game) =>
        ({
          ...game.toJSON(),
        }) as GameBreakdown,
    );

    this._addBreakdownInfo(games, player, system);
    this._determineUsedForRanking(games, system);
    this._calculateAverageUpgrade(games, system, rankingPlace, type);

    return {
      avgUpgrade: games?.find((x) => x.highestAvgUpgrade)?.avgUpgrade,
      avgDowngrade: games?.find((x) => x.highestAvgDowngrade)?.avgDowngrade,
    };
  }

  private _addBreakdownInfo(games: GameBreakdown[], player: Player, system: RankingSystem) {
    for (const game of games) {
      const me = game.players?.find((x) => x.id == player.id);
      if (!me) {
        throw new Error('Player not found');
      }
      if (!game.gameType) {
        console.warn(`Game ${game.id} has no gameType`);
        throw new Error('Game has no gameType');
      }

      const rankingPoint = game.rankingPoints?.find((x) => x.playerId == player.id);

      const type = getGameResultType(game.winner == me.GamePlayerMembership.team, game.gameType, {
        differenceInLevel: rankingPoint?.differenceInLevel ?? 0,
        system: system,
      });

      game.points = rankingPoint?.points ?? 0;
      game.type = type;
      game.opponent =
        game.players?.filter((x) => x.GamePlayerMembership.team !== me.GamePlayerMembership.team) ??
        [];
      game.team =
        game.players?.filter((x) => x.GamePlayerMembership.team == me.GamePlayerMembership.team) ??
        [];

      // defaults
      game.usedForDowngrade = false;
      game.usedForUpgrade = false;
      game.canUpgrade = false;
      game.canDowngrade = false;
    }
  }

  private _determineUsedForRanking(games: GameBreakdown[], system: RankingSystem) {
    let validGamesUpgrade = 0;
    let validGamesDowngrade = 0;

    // sort games by playedAt newest first
    for (const game of games.slice().sort((a, b) => {
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

      if (validUpgrade && validGamesUpgrade < (system?.latestXGamesToUse ?? Infinity)) {
        validGamesUpgrade++;
        game.usedForUpgrade = true;
      }
      if (validDowngrade && validGamesDowngrade < (system?.latestXGamesToUse ?? Infinity)) {
        validGamesDowngrade++;
        game.usedForDowngrade = true;
      }

      // if both x games are used, the rest of the games are not used
      if (
        validGamesUpgrade >= (system?.latestXGamesToUse ?? Infinity) &&
        validGamesDowngrade >= (system?.latestXGamesToUse ?? Infinity)
      ) {
        break;
      }
    }

    return games;
  }

  private _calculateAverageUpgrade(
    games: GameBreakdown[],
    system: RankingSystem,
    rankingPlace: RankingPlace,
    type: 'single' | 'double' | 'mix',
  ) {
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
    let workingAvgUpgrade = undefined;
    for (const game of games.filter((x) => x.usedForUpgrade)) {
      gamesProssecedUpgrade++;
      game.devideUpgrade = gamesProssecedUpgrade;
      game.countUpgrade = gamesProssecedUpgrade;

      let divider = gamesProssecedUpgrade;
      if (divider < (system.minNumberOfGamesUsedForUpgrade ?? 1)) {
        divider = system.minNumberOfGamesUsedForUpgrade ?? 1;
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
    let workingAvgDowngrade = undefined;
    for (const game of games.filter((x) => x.usedForDowngrade)) {
      gamesProssecedDowngrade++;
      game.devideDowngrade = gamesProssecedDowngrade;
      game.countDowngrade = gamesProssecedDowngrade;

      let divider = gamesProssecedDowngrade;
      if (divider < (system.minNumberOfGamesUsedForDowngrade ?? 1)) {
        divider = system.minNumberOfGamesUsedForDowngrade ?? 1;
      }

      totalPointsDowngrade += game.points ?? 0;
      const avg = totalPointsDowngrade / divider;
      if (avg > (workingAvgDowngrade ?? 0)) {
        workingAvgDowngrade = avg;
      }

      game.totalPointsDowngrade = totalPointsDowngrade;
      game.avgDowngrade = workingAvgDowngrade;
      game.devideDowngradeCorrected = divider;
    }
    const level = rankingPlace?.[type ?? 'single'] ?? 12;

    // set highest avg for upgrade and downgrade
    for (const game of games) {
      if (game.avgUpgrade == workingAvgUpgrade) {
        game.highestAvgUpgrade = true;
        if (
          workingAvgUpgrade >= (system.pointsToGoUp?.[(system.amountOfLevels ?? 12) - level] ?? 0)
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
          (system.pointsToGoDown?.[(system.amountOfLevels ?? 12) - (level + 1)] ?? 0)
        ) {
          game.canDowngrade = true;
        }
        break;
      }
    }

    return games;
  }
}

interface GameBreakdown extends Game {
  points?: number;

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
  team: Player[];
  opponent: Player[];
  countUpgrade?: number;
  countDowngrade?: number;
}
