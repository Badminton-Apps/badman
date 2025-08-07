import { Game, Player, RankingPlace, RankingPoint, RankingSystem } from "@badman/backend-database";
import { GameBreakdownType, GameType, getGameResultType } from "@badman/utils";
import { Injectable, Logger } from "@nestjs/common";
import moment from "moment";
import { Op } from "sequelize";
import xlsx from "xlsx";

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
      attributes: ["id", "firstName", "lastName", "memberId", "gender"],
      where: {
        competitionPlayer: true,
        // memberId: '51648865',
        // memberId: '50072145',
      },
      include: [
        {
          attributes: [
            "id",
            "single",
            "double",
            "mix",
            "singlePoints",
            "doublePoints",
            "mixPoints",
            "rankingDate",
            "systemId",
          ],
          model: RankingPlace,
          where: {
            systemId: primarySystem.id,
            rankingDate: {
              [Op.in]: ["2024-09-02", "2024-08-12"],
            },
          },
        },
      ],
      order: [
        ["lastName", "ASC"],
        ["firstName", "ASC"],
      ],
    });

    // write players with ranking to excel
    const wb = xlsx.utils.book_new();

    const singles = await this.mapData(players, primarySystem, "single");
    const ws = xlsx.utils.json_to_sheet(singles);
    xlsx.utils.book_append_sheet(wb, ws, "Singles");

    const doubles = await this.mapData(players, primarySystem, "double");
    const ws2 = xlsx.utils.json_to_sheet(doubles);
    xlsx.utils.book_append_sheet(wb, ws2, "Doubles");

    const mix = await this.mapData(players, primarySystem, "mix");
    const ws3 = xlsx.utils.json_to_sheet(mix);
    xlsx.utils.book_append_sheet(wb, ws3, "Mix");

    xlsx.writeFile(wb, "players-with-ranking.xlsx");
  }

  private async mapData(
    players: Player[],
    system: RankingSystem,
    type: "single" | "double" | "mix"
  ) {
    this.logger.debug(`Mapping ${players.length} data for ${type}`);
    const data = [];
    for (const player of players) {
      const rankingSep = player.rankingPlaces.find(
        (rp) => rp.systemId === system.id && moment(rp.rankingDate).isSame("2024-09-02", "day")
      );

      const rankingAug = player.rankingPlaces.find(
        (rp) => rp.systemId === system.id && moment(rp.rankingDate).isSame("2024-08-12", "day")
      );

      const averages = await this.calcaulateAverages(
        player,
        system,
        type,
        "2024-09-02",
        rankingSep
      );

      const pointsNeededForPromotion =
        system.pointsToGoUp[system.pointsToGoUp.length + 1 - (rankingAug?.[type] ?? 0)];
      const pointsNeededForDowngrade =
        system.pointsToGoDown[system.pointsToGoDown.length - (rankingAug?.[type] ?? 0)];

      const shouldHaveGoneUp =
        rankingSep?.[type + "Points"] > pointsNeededForPromotion &&
        rankingAug?.[type] == rankingSep?.[type];

      let shouldHaveGoneDown =
        (averages.avgDowngrade ?? Infinity) < pointsNeededForDowngrade &&
        rankingAug?.[type] == rankingSep?.[type] &&
        !shouldHaveGoneUp;

      shouldHaveGoneDown = this.validateShouldHaveGoneDown(
        shouldHaveGoneDown,
        type,
        rankingAug,
        system
      );

      data.push({
        Name: player.fullName,
        Number: player.memberId,
        Gender: player.gender,
        ["Ranking sep"]: rankingSep?.[type],
        ["Ranking aug"]: rankingAug?.[type],
        ["Points upgrade"]: rankingSep?.[type + "Points"],
        ["Points downgrade"]: averages.avgDowngrade ? Math.round(averages.avgDowngrade) : "",
        ["Points needed"]: pointsNeededForPromotion,
        ["Should have gone up"]: shouldHaveGoneUp ? "Yes" : "No",
        ["Points needed downgrade"]: pointsNeededForDowngrade,
        ["Should have gone down"]: shouldHaveGoneDown ? "Yes" : "No",
      });
    }
    return data;
  }

  private validateShouldHaveGoneDown(
    shouldHaveGoneDown: boolean,
    type: string,
    rankingJul: RankingPlace,
    system: RankingSystem
  ) {
    if (shouldHaveGoneDown) {
      const ranking = Math.min(rankingJul?.[type] + 1, system.amountOfLevels);

      if (type !== "single") {
        if (ranking - (rankingJul?.single ?? 0) > system.maxDiffLevels) {
          return false;
        }
      }
      if (type !== "double") {
        if (ranking - (rankingJul?.double ?? 0) > system.maxDiffLevels) {
          return false;
        }
      }
      if (type !== "mix") {
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
    type: "single" | "double" | "mix",
    calcDate: string,
    rankingPlace: RankingPlace
  ) {
    const games = await player.getGames({
      where: {
        gameType: type == "single" ? GameType.S : type == "double" ? GameType.D : GameType.MX,
        playedAt: {
          [Op.lte]: calcDate,
          [Op.gt]: moment(calcDate)
            .subtract(system.periodAmount, system.periodUnit)
            .format("YYYY-MM-DD"),
        },
      },
      include: [
        { model: RankingPoint, where: { systemId: system.id } },
        {
          model: Player,
        },
      ],
    });

    if (games.length == 0) {
      return {
        avgUpgrade: 0,
        avgDowngrade: 0,
      };
    }

    const breakdownInfo = new Map<string, GameBreakdown>();

    this._addBreakdownInfo(games, breakdownInfo, player, system);
    this._determineUsedForRanking(games, breakdownInfo, system);
    this._calculateAverageUpgrade(games, breakdownInfo, system, rankingPlace, type);

    // find in the breakdownInfo the highest avgUpgrade and avgDowngrade
    const gamesArray = Array.from(breakdownInfo.values());

    return {
      avgUpgrade: gamesArray?.find((x) => x.highestAvgUpgrade)?.avgUpgrade,
      avgDowngrade: gamesArray?.find((x) => x.highestAvgDowngrade)?.avgDowngrade,
    };
  }

  private _addBreakdownInfo(
    games: Game[],
    breakdownInfo: Map<string, GameBreakdown>,
    player: Player,
    system: RankingSystem
  ) {
    for (const game of games) {
      const me = game.players?.find((x) => x.id == player.id);
      if (!me) {
        throw new Error("Player not found");
      }
      if (!game.gameType) {
        console.warn(`Game ${game.id} has no gameType`);
        throw new Error("Game has no gameType");
      }

      const rankingPoint = game.rankingPoints?.find((x) => x.playerId == player.id);

      const type = getGameResultType(game.winner == me.GamePlayerMembership.team, game.gameType, {
        differenceInLevel: rankingPoint?.differenceInLevel ?? 0,
        system: system,
      });

      const info = {} as GameBreakdown;

      info.points = rankingPoint?.points ?? 0;
      info.type = type;
      info.opponent =
        game.players?.filter((x) => x.GamePlayerMembership.team !== me.GamePlayerMembership.team) ??
        [];
      info.team =
        game.players?.filter((x) => x.GamePlayerMembership.team == me.GamePlayerMembership.team) ??
        [];

      // defaults
      info.usedForDowngrade = false;
      info.usedForUpgrade = false;
      info.canUpgrade = false;
      info.canDowngrade = false;

      breakdownInfo.set(game.id, info);
    }
  }

  private _determineUsedForRanking(
    games: Game[],
    breakdownInfo: Map<string, GameBreakdown>,
    system: RankingSystem
  ) {
    let validGamesUpgrade = 0;
    let validGamesDowngrade = 0;

    // sort games by playedAt newest first
    for (const game of games.slice().sort((a, b) => {
      if (!a.playedAt || !b.playedAt) {
        return 0;
      }
      return b.playedAt.getTime() - a.playedAt.getTime();
    })) {
      const info = breakdownInfo.get(game.id);

      if (info.type == GameBreakdownType.LOST_IGNORED) {
        continue;
      }

      let validUpgrade = false;
      let validDowngrade = false;

      if (info.type == GameBreakdownType.WON) {
        validUpgrade = true;
        validDowngrade = true;
      } else {
        if (info.type == GameBreakdownType.LOST_UPGRADE) {
          validUpgrade = true;
        }

        if (info.type == GameBreakdownType.LOST_DOWNGRADE) {
          validUpgrade = true;
          validDowngrade = true;
        }
      }

      if (validUpgrade && validGamesUpgrade < (system?.latestXGamesToUse ?? Infinity)) {
        validGamesUpgrade++;
        info.usedForUpgrade = true;
      }
      if (validDowngrade && validGamesDowngrade < (system?.latestXGamesToUse ?? Infinity)) {
        validGamesDowngrade++;
        info.usedForDowngrade = true;
      }

      // if both x games are used, the rest of the games are not used
      if (
        validGamesUpgrade >= (system?.latestXGamesToUse ?? Infinity) &&
        validGamesDowngrade >= (system?.latestXGamesToUse ?? Infinity)
      ) {
        break;
      }

      breakdownInfo.set(game.id, info);
    }

    return games;
  }

  private _calculateAverageUpgrade(
    games: Game[],
    breakdownInfo: Map<string, GameBreakdown>,
    system: RankingSystem,
    rankingPlace: RankingPlace,
    type: "single" | "double" | "mix"
  ) {
    // sort games if used for donwgrade first
    // then first all 0 points,
    // then highest points first
    // then newest first

    games = games.sort((a, b) => {
      const infoA = breakdownInfo.get(a.id);
      const infoB = breakdownInfo.get(b.id);

      if (infoA.points == 0 && infoB.points != 0) {
        return -1;
      }

      if (infoA.points != 0 && infoB.points == 0) {
        return 1;
      }

      if (infoA.points == infoB.points) {
        return 0;
      }
      return (infoA.points ?? 0) > (infoB.points ?? 0) ? -1 : 1;
    });

    // Upgrade
    let totalPointsUpgrade = 0;
    let gamesProssecedUpgrade = 0;
    let workingAvgUpgrade = undefined;
    for (const game of games.filter((x) => {
      const info = breakdownInfo.get(x.id);
      return info.usedForUpgrade;
    })) {
      const info = breakdownInfo.get(game.id);

      gamesProssecedUpgrade++;
      info.devideUpgrade = gamesProssecedUpgrade;
      info.countUpgrade = gamesProssecedUpgrade;

      let divider = gamesProssecedUpgrade;
      if (divider < (system.minNumberOfGamesUsedForUpgrade ?? 1)) {
        divider = system.minNumberOfGamesUsedForUpgrade ?? 1;
      }

      totalPointsUpgrade += info.points ?? 0;
      const avg = totalPointsUpgrade / divider;
      if (avg > (workingAvgUpgrade ?? 0)) {
        workingAvgUpgrade = avg;
      }

      info.totalPointsUpgrade = totalPointsUpgrade;
      info.avgUpgrade = workingAvgUpgrade;
      info.devideUpgradeCorrected = divider;

      breakdownInfo.set(game.id, info);
    }

    // Downgrade
    let totalPointsDowngrade = 0;
    let gamesProssecedDowngrade = 0;
    let workingAvgDowngrade = undefined;
    for (const game of games.filter((x) => {
      const info = breakdownInfo.get(x.id);
      return info.usedForDowngrade;
    })) {
      const info = breakdownInfo.get(game.id);

      gamesProssecedDowngrade++;
      info.devideDowngrade = gamesProssecedDowngrade;
      info.countDowngrade = gamesProssecedDowngrade;

      let divider = gamesProssecedDowngrade;
      if (divider < (system.minNumberOfGamesUsedForDowngrade ?? 1)) {
        divider = system.minNumberOfGamesUsedForDowngrade ?? 1;
      }

      totalPointsDowngrade += info.points ?? 0;
      const avg = totalPointsDowngrade / divider;
      if (avg > (workingAvgDowngrade ?? 0)) {
        workingAvgDowngrade = avg;
      }

      info.totalPointsDowngrade = totalPointsDowngrade;
      info.avgDowngrade = workingAvgDowngrade;
      info.devideDowngradeCorrected = divider;

      breakdownInfo.set(game.id, info);
    }
    const level = rankingPlace?.[type ?? "single"] ?? 12;

    // set highest avg for upgrade and downgrade
    for (const game of games) {
      const info = breakdownInfo.get(game.id);
      if (info.avgUpgrade == workingAvgUpgrade) {
        info.highestAvgUpgrade = true;
        if (
          workingAvgUpgrade >= (system.pointsToGoUp?.[(system.amountOfLevels ?? 12) - level] ?? 0)
        ) {
          info.canUpgrade = true;
          breakdownInfo.set(game.id, info);
        }
        break;
      }
    }
    for (const game of games) {
      const info = breakdownInfo.get(game.id);

      if (info.avgDowngrade == workingAvgDowngrade) {
        info.highestAvgDowngrade = true;
        if (
          workingAvgDowngrade <=
          (system.pointsToGoDown?.[(system.amountOfLevels ?? 12) - (level + 1)] ?? 0)
        ) {
          info.canDowngrade = true;
        }
        breakdownInfo.set(game.id, info);
        break;
      }
    }

    return games;
  }
}

interface GameBreakdown {
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
