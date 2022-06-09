import { SyncQueue } from '@badman/queue';
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

@Processor({
  name: SyncQueue
})
export class SyncRankingProcessor {
  public static SyncRanking = 'SyncRanking';
  private readonly logger = new Logger(SyncRankingProcessor.name);

  constructor() {
    this.logger.debug('SyncConsumer');
  }

  @Process(SyncRankingProcessor.SyncRanking)
  async processNamedJob(job: Job<string>): Promise<void> {
    this.logger.debug('Named job processed', job.data);
  }
}
