import {
  DataBaseHandler,
  logger,
  RankingSystem,
  RankingSystemGroup,
  RankingSystems
} from '@badvlasim/shared';
import { Moment } from 'moment';
import { BvlRankingCalc, LfbbRankingCalc, OriginalRankingCalc } from './rankingTypes';

export class RankingCalculator {
  constructor(private _databaseService: DataBaseHandler) {}

  async calculateRanking(systemIds: string[], stop: Moment, fromStart: boolean, start?: Moment) {
    const rankingSystems = (
      await RankingSystem.findAll({
        where: {
          id: systemIds,
          runCurrently: false
        },
        include: [{ model: RankingSystemGroup }]
      })
    ).map(x => {
      switch (x.rankingSystem) {
        case RankingSystems.LFBB:
          return new LfbbRankingCalc(x, this._databaseService, fromStart);
        case RankingSystems.BVL:
          return new BvlRankingCalc(x, this._databaseService, fromStart);
        case RankingSystems.ORIGINAL:
          return new OriginalRankingCalc(x, this._databaseService, fromStart);
      }
    });

    try {
      for (const system of rankingSystems) {
        logger.info(
          `Before calcualting for [${system.rankingType.name}] (${system.rankingType.id})`
        );
        await system.beforeCalculationAsync(start);
        logger.info(
          `Before Calcualting finished for [${system.rankingType.name}] (${system.rankingType.id})`
        );
      }

      for (const system of rankingSystems) {
        logger.info(`Calculate for [${system.rankingType.name}] (${system.rankingType.id})`);
        await system.calculateAsync(stop, start);
        logger.info(
          `Calculate finished for [${system.rankingType.name}] (${system.rankingType.id})`
        );
      }
    } catch (e) {
      logger.error(e);
    } finally {
      for (const system of rankingSystems) {
        logger.info(
          `After Calculation for [${system.rankingType.name}] (${system.rankingType.id})`
        );
        await system.afterCalculationAsync();
        logger.info(
          `After Calculation finished for [${system.rankingType.name}] (${system.rankingType.id})`
        );
      }
    }
  }
}
