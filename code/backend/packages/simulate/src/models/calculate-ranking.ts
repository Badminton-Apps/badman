import {
  logger,
  RankingSystem,
  RankingSystemGroup,
  RankingSystems,
  BvlRankingCalc,
  LfbbRankingCalc,
  OriginalRankingCalc
} from '@badvlasim/shared';
import { Moment } from 'moment';

export class RankingCalculator {
  async calculateRanking(systemIds: string[], stop: Moment, fromStart: boolean, start?: Moment) {
    const rankingSystems = (
      await RankingSystem.findAll({
        where: {
          id: systemIds,
          runCurrently: false
        },
        include: [{ model: RankingSystemGroup }]
      })
    ).map((x) => {
      switch (x.rankingSystem) {
        case RankingSystems.LFBB:
          return new LfbbRankingCalc(x, fromStart);
        case RankingSystems.BVL:
          return new BvlRankingCalc(x, fromStart);
        case RankingSystems.ORIGINAL:
          return new OriginalRankingCalc(x, fromStart);
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

      // TODO: enable after everything is imported
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
