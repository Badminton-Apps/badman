import { SyncQueue, Sync } from '@badman/backend/queue';
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { Sequelize } from 'sequelize-typescript';
import { RankingSyncer } from './ranking-sync';

@Processor({
  name: SyncQueue,
})
export class SyncRankingProcessor {
  private readonly logger = new Logger(SyncRankingProcessor.name);

  private _rankingSync: RankingSyncer;

  constructor(private _sequelize: Sequelize) {
    this.logger.debug('SyncRanking');
    this._rankingSync = new RankingSyncer();
  }

  @Process(Sync.SyncRanking)
  async syncRanking(job: Job<string>): Promise<void> {
    this.logger.debug('Syncing Ranking', job.data);

    const transaction = await this._sequelize.transaction();

    await this._rankingSync.process({
      transaction,
    });

    await transaction.commit();
  }
}
