import { RankingSystem } from '@badman/backend-database';
import { Ranking, RankingQueue, UpdateRankingJob } from '@badman/backend-queue';
import { CalculationService } from '@badman/backend-ranking';
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

@Processor({
  name: RankingQueue,
})
export class RankingProcessor {
  private readonly _logger = new Logger(RankingProcessor.name);

  constructor(private calculationService: CalculationService) {
    this._logger.debug('SyncRanking');
  }

  @Process(Ranking.UpdateRanking)
  async startSimulation(job: Job<UpdateRankingJob>): Promise<void> {
    this._logger.log('Start update ranking');

    const system = await RankingSystem.findByPk(job.data.systemId);
    if (!system) {
      this._logger.error('System not found');
      throw new Error('System not found');
    }

    await this.calculationService.updateRanking(system.id, { ...job.data });

  }
}
