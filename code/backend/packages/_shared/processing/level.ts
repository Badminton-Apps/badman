import moment from 'moment';
import { Op, SaveOptions, Transaction } from 'sequelize';
import { Game, GameType, Player, RankingPlace, RankingSystem } from '../models';

export class RankingProcessor {
  static async checkInactive(instances: RankingPlace[], options: SaveOptions) {
    const singleNullInstances = instances.filter(
      (instance) => instance.single === null || instance.single === undefined
    );
    const doubleNullInstances = instances.filter(
      (instance) => instance.double === null || instance.double === undefined
    );
    const mixNullInstances = instances.filter(
      (instance) => instance.mix === null || instance.mix === undefined
    );

    const systemDisintct = instances.filter(
      (value, index, self) =>
        self.findIndex((m) => m.SystemId === value.SystemId) === index
    );

    const systems = await RankingSystem.findAll({
      where: {
        id: {
          [Op.in]: systemDisintct.map((instance) => instance.SystemId),
        },
      },
      transaction: options.transaction,
    });

    for (const instance of singleNullInstances) {
      const system = systems.find((r) => r.id === instance.SystemId);
      const place = await RankingPlace.findOne({
        attributes: ['id', 'single', 'singleInactive'],
        where: {
          SystemId: instance.SystemId,
          playerId: instance.playerId,
          single: {
            [Op.not]: null,
          },
          rankingDate: {
            [Op.lt]: instance.rankingDate,
          },
        },
        order: [['rankingDate', 'DESC']],
        transaction: options.transaction,
      });

      const player = await Player.findByPk(instance.playerId, {
        attributes: ['id'],
        include: [
          {
            attributes: ['id'],
            required: false,
            model: Game,
            as: 'games',
            where: {
              gameType: GameType.S,
              playedAt: {
                [Op.gte]: moment(instance.rankingDate)
                  .add(system.inactivityAmount, system.inactivityUnit)
                  .toDate(),
              },
            },
          },
        ],
        transaction: options.transaction,
      });

      instance.single = place?.single;
      instance.singleInactive =
        (player.games?.length ?? 0) < system.gamesForInactivty;
    }

    for (const instance of doubleNullInstances) {
      const system = systems.find((r) => r.id === instance.SystemId);
      const place = await RankingPlace.findOne({
        attributes: ['id', 'double', 'doubleInactive'],
        where: {
          SystemId: instance.SystemId,
          playerId: instance.playerId,
          double: {
            [Op.not]: null,
          },
          rankingDate: {
            [Op.gt]: instance.rankingDate,
          },
        },
        order: [['rankingDate', 'DESC']],
        transaction: options.transaction,
      });

      const player = await Player.findByPk(instance.playerId, {
        attributes: ['id'],
        include: [
          {
            attributes: ['id'],
            required: false,
            model: Game,
            as: 'games',
            where: {
              gameType: GameType.D,
              playedAt: {
                [Op.gte]: moment(instance.rankingDate)
                  .add(system.inactivityAmount, system.inactivityUnit)
                  .toDate(),
              },
            },
          },
        ],
        transaction: options.transaction,
      });

      instance.double = place?.double;
      instance.doubleInactive =
        (player.games?.length ?? 0) < system.gamesForInactivty;
    }

    for (const instance of mixNullInstances) {
      const system = systems.find((r) => r.id === instance.SystemId);
      const place = await RankingPlace.findOne({
        attributes: ['id', 'mix', 'mixInactive'],
        where: {
          SystemId: instance.SystemId,
          playerId: instance.playerId,
          mix: {
            [Op.not]: null,
          },
          rankingDate: {
            [Op.gt]: instance.rankingDate,
          },
        },
        order: [['rankingDate', 'DESC']],
        transaction: options.transaction,
      });

      const player = await Player.findByPk(instance.playerId, {
        attributes: ['id'],
        include: [
          {
            attributes: ['id'],
            required: false,
            model: Game,
            as: 'games',
            where: {
              gameType: GameType.MX,
              playedAt: {
                [Op.gte]: moment(instance.rankingDate)
                  .add(system.inactivityAmount, system.inactivityUnit)
                  .toDate(),
              },
            },
          },
        ],
        transaction: options.transaction,
      });

      instance.mix = place?.mix;
      instance.mixInactive =
        (player.games?.length ?? 0) < system.gamesForInactivty;
    }
  }

  static async protectRanking(
    rankingPoints: RankingPlace[],
    rankingSystems?: RankingSystem[],
    args?: {
      transaction?: Transaction,
    }
  ): Promise<RankingPlace[]> {
    if (
      (rankingSystems === undefined || rankingSystems === null) &&
      rankingPoints.length > 0
    ) {
      rankingSystems = await RankingSystem.findAll({
        where: {
          id: {
            [Op.in]: rankingPoints.map((r) => r.SystemId),
          },
        },
        transaction: args?.transaction,
      });
    }

    return Promise.all(
      rankingPoints.map((rankingPoint) =>
        this._protect(
          rankingPoint,
          rankingSystems.find((r) => r.id === rankingPoint.SystemId)
        )
      )
    );
  }

  private static _protect(
    rankingPoint: RankingPlace,
    rankingSystem: RankingSystem
  ): RankingPlace {
    rankingPoint.single = rankingPoint.single || 12;
    rankingPoint.double = rankingPoint.double || 12;
    rankingPoint.mix = rankingPoint.mix || 12;

    const highest = Math.min(
      rankingPoint.single,
      rankingPoint.double,
      rankingPoint.mix
    );

    if (rankingPoint.single - highest >= rankingSystem.maxDiffLevels) {
      rankingPoint.single = highest + rankingSystem.maxDiffLevels;
    }
    if (rankingPoint.double - highest >= rankingSystem.maxDiffLevels) {
      rankingPoint.double = highest + rankingSystem.maxDiffLevels;
    }
    if (rankingPoint.mix - highest >= rankingSystem.maxDiffLevels) {
      rankingPoint.mix = highest + rankingSystem.maxDiffLevels;
    }

    // if (rankingPoints.single - highestRanking.single > rankingSystem.maxDiffLevelsHighest) {
    //   rankingPoints.single = highestRanking.single + rankingSystem.maxDiffLevelsHighest;
    // }
    // if (rankingPoints.double - highestRanking.double > rankingSystem.maxDiffLevelsHighest) {
    //   rankingPoints.double = highestRanking.double + rankingSystem.maxDiffLevelsHighest;
    // }
    // if (rankingPoints.mix - highestRanking.mix > rankingSystem.maxDiffLevelsHighest) {
    //   rankingPoints.mix = highestRanking.mix + rankingSystem.maxDiffLevelsHighest;
    // }

    if (rankingPoint.single > rankingSystem.amountOfLevels) {
      rankingPoint.single = rankingSystem.amountOfLevels;
    }
    if (rankingPoint.double > rankingSystem.amountOfLevels) {
      rankingPoint.double = rankingSystem.amountOfLevels;
    }
    if (rankingPoint.mix > rankingSystem.amountOfLevels) {
      rankingPoint.mix = rankingSystem.amountOfLevels;
    }

    return rankingPoint;
  }
}
