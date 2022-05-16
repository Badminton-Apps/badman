import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

@Processor('ranking-queue')
export class RankingConsumer {
  private readonly logger = new Logger(RankingConsumer.name);

  constructor(){
    this.logger.debug('RankingConsumer');
  }

  @Process('namedjob')
  async processNamedJob(job: Job<string>): Promise<void> {
    this.logger.debug('Named job processed', job);
  }
}
