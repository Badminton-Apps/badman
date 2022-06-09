import { RankingQueue } from '@badman/queue';
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

@Processor({
  name: RankingQueue
})
export class RankingConsumer {
  private readonly logger = new Logger(RankingConsumer.name);

  constructor(){
    this.logger.debug('RankingConsumer');
  }

  @Process('calculate-points')
  async calculatePoints(job: Job<string>): Promise<void> {
    this.logger.debug('Named job processed', job);
  }
}
