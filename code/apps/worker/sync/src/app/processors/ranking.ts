import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

@Processor('sync-queue')
export class RankingComsumer {
  private readonly logger = new Logger(RankingComsumer.name);

  constructor(){
    this.logger.debug('SyncConsumer');
  }

  @Process('namedjob')
  async processNamedJob(job: Job<string>): Promise<void> {
    this.logger.debug('Named job processed', job.data);
  }
}
