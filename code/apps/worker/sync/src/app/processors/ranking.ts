import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

@Processor('sync-queue')
export class RankingComsumer {
  public static SyncRanking = 'SyncRanking';
  private readonly logger = new Logger(RankingComsumer.name);

  constructor() {
    this.logger.debug('SyncConsumer');
  }

  @Process(RankingComsumer.SyncRanking)
  async processNamedJob(job: Job<string>): Promise<void> {
    this.logger.debug('Named job processed', job.data);
  }
}
