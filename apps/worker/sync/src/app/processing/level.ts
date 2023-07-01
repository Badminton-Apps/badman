import moment from 'moment';
import { Op, SaveOptions, Transaction } from 'sequelize';
import {
  Game,
  Player,
  RankingPlace,
  RankingSystem,
} from '@badman/backend-database';
import { GameType } from '@badman/utils';

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
        self.findIndex((m) => m.systemId === value.systemId) === index
    );

    const systems = await RankingSystem.findAll({
      where: {
        id: {
          [Op.in]: systemDisintct.map((instance) => instance.systemId),
        },
      },
      transaction: options.transaction,
    });

    for (const instance of singleNullInstances) {
      const system = systems.find((r) => r.id === instance.systemId);

      if (!system) {
        throw new Error(`No system found for rankingPlace ${instance.id}`);
      }

      const place = await RankingPlace.findOne({
        attributes: ['id', 'single', 'singleInactive'],
        where: {
          systemId: instance.systemId,
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

      if (!player) {
        throw new Error(`No player found for rankingPlace ${instance.id}`);
      }

      instance.single = place?.single;
      if (system.gamesForInactivty) {
        instance.singleInactive =
          (player.games?.length ?? 0) < system.gamesForInactivty;
      }
    }

    for (const instance of doubleNullInstances) {
      const system = systems.find((r) => r.id === instance.systemId);

      if (!system) {
        throw new Error(`No system found for rankingPlace ${instance.id}`);
      }

      const place = await RankingPlace.findOne({
        attributes: ['id', 'double', 'doubleInactive'],
        where: {
          systemId: instance.systemId,
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
      if (system.gamesForInactivty) {
        instance.doubleInactive =
          (player?.games?.length ?? 0) < system.gamesForInactivty;
      }
    }

    for (const instance of mixNullInstances) {
      const system = systems.find((r) => r.id === instance.systemId);

      if (!system) {
        throw new Error(`No system found for rankingPlace ${instance.id}`);
      }
      const place = await RankingPlace.findOne({
        attributes: ['id', 'mix', 'mixInactive'],
        where: {
          systemId: instance.systemId,
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
      if (system.gamesForInactivty) {
        instance.mixInactive =
          (player?.games?.length ?? 0) < system.gamesForInactivty;
      }
    }
  }

  static async protectRanking(
    rankingPoints: RankingPlace[],
    rankingSystems?: RankingSystem[],
    args?: {
      transaction?: Transaction;
    }
  ): Promise<RankingPlace[]> {
    if (
      (rankingSystems === undefined || rankingSystems === null) &&
      rankingPoints.length > 0
    ) {
      rankingSystems = await RankingSystem.findAll({
        where: {
          id: {
            [Op.in]: rankingPoints.map((r) => r.systemId),
          },
        },
        transaction: args?.transaction,
      });
    }

    return Promise.all(
      rankingPoints.map((rankingPoint) => {
        const usedSystem = rankingSystems?.find(
          (r) => r.id === rankingPoint.systemId
        );

        if (!usedSystem) {
          throw new Error(
            `No system found for rankingPoint ${rankingPoint.id}`
          );
        }

        return this._protect(rankingPoint, usedSystem);
      })
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

    if (rankingPoint.single - highest >= (rankingSystem.maxDiffLevels ?? 0)) {
      rankingPoint.single = highest + (rankingSystem.maxDiffLevels ?? 0);
    }
    if (rankingPoint.double - highest >= (rankingSystem.maxDiffLevels ?? 0)) {
      rankingPoint.double = highest + (rankingSystem.maxDiffLevels ?? 0);
    }
    if (rankingPoint.mix - highest >= (rankingSystem.maxDiffLevels ?? 0)) {
      rankingPoint.mix = highest + (rankingSystem.maxDiffLevels ?? 0);
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
