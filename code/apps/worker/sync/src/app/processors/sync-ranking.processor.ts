import { SyncQueue, Ranking } from '@badman/queue';
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

@Processor({
  name: SyncQueue
})
export class SyncRankingProcessor {
  private readonly logger = new Logger(SyncRankingProcessor.name);

  constructor() {
    this.logger.debug('SyncRankingConsumer');
  }



  @Process(Ranking.SyncRanking)
  async processNamedJob(job: Job<string>): Promise<void> {
    this.logger.debug('Named job processed', job.data);
  }
}
