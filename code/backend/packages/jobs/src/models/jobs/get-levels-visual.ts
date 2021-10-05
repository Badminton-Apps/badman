import { Cron, DataBaseHandler, logger } from '@badvlasim/shared';
import { CronJob } from '../cronJob';
import { RankingSyncer } from './visualSyncer/ranking-sync';

export class GetRankingVisual extends CronJob {
  private _levelSync: RankingSyncer;
  private _meta: any;

  constructor(cron: Cron) {
    super(cron);
    this._meta = JSON.parse(cron.meta) as any;

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

  static dbEntry(): {
    cron: string;
    type: string;
  } {
    return {
      cron: '0 1 * * *',
      type: 'ranking-visual'
    };
  }
}
