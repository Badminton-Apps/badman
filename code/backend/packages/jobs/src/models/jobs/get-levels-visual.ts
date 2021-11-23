import { Cron, DataBaseHandler, logger } from '@badvlasim/shared';
import { CronJob } from '../cronJob';
import { RankingSyncer } from './visualSyncer/get-levels-visual';

export class GetRankingVisual extends CronJob {
  static dbEntry(): {
    cron: string;
    type: string;
  } {
    return {
      cron: '0 */4 * * *',
      type: 'levels-visual'
    };
  }

  private _levelSync: RankingSyncer;

  constructor(cron: Cron) {
    super(cron);

    this._levelSync = new RankingSyncer();
  }

  async run(): Promise<void> {
    logger.info('Started sync of Visual ranking');
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      await this._levelSync.process({ transaction });
      await transaction.commit();
    } catch (e) {
      logger.error('Rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
 

}
 