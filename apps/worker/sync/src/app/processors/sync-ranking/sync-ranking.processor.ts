import { SyncQueue, Sync } from '@badman/backend-queue';
import { VisualService } from '@badman/backend-visual';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { Sequelize } from 'sequelize-typescript';
import { RankingSyncer } from './ranking-sync';

@Processor({
  name: SyncQueue,
})
export class SyncRankingProcessor {
  private readonly logger = new Logger(SyncRankingProcessor.name);

  private _rankingSync: RankingSyncer;

  constructor(
    private _sequelize: Sequelize,
    visualService: VisualService,
    @InjectQueue(SyncQueue) readonly rankingQ: Queue
  ) {
    this._rankingSync = new RankingSyncer(visualService, rankingQ);
  }

  @Process(Sync.SyncRanking)
  async syncRanking(
    job: Job<{
      start: string;
    }>
  ): Promise<void> {
    this.logger.debug(`Syncing Ranking, data: ${JSON.stringify(job.data)}`);

    const transaction = await this._sequelize.transaction();

    try {
      await this._rankingSync.process({
        transaction,
        ...job.data,
      });

      this.logger.debug('Commiting');

      await transaction.commit();
      this.logger.debug('Syncing Ranking done');
    } catch (error) {
      this.logger.error('Rolling back');
      await transaction.rollback();
      throw error;
    }
  }
}
