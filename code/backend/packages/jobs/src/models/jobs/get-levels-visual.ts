import { Cron, DataBaseHandler, logger } from '@badvlasim/shared';
import moment from 'moment';
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

  async run(args?: { date: Date; skip: string[] }): Promise<void> {
    this.dbCron = await Cron.findByPk(this.dbCron.id); 
    logger.info('Started sync of Visual ranking');
    const transaction = await DataBaseHandler.sequelizeInstance.transaction();
    try {
      await this._levelSync.process({
        transaction,
        runFrom: args?.date,
        cron: this.dbCron,
      });
      await transaction.commit();
    } catch (e) {
      logger.error('Rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
}
