import { Game, Player, RankingSystem } from '@badman/backend-database';
import { Badminton, Simulation, SimulationPointsJob } from '@badman/backend-queue';
import { BelgiumFlandersPointsService } from '@badman/belgium-flanders-points';
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

@Processor({
  name: Badminton.Belgium.Flanders.Points,
})
export class PointProcessor {
  private readonly logger = new Logger(PointProcessor.name);

  constructor(private readonly pointService: BelgiumFlandersPointsService) {}

  @Process({
    name: Simulation.CalculatePoint,
  })
  async calulatePlace(job: Job<SimulationPointsJob>) {
    const game = await Game.findByPk(job.data.gameId, {
      include: [
        {
          model: Player,
        },
      ],
    });
    if (!game) {
      this.logger.error(`game not found ${job.data.gameId}`);
      throw new Error('game not found');
    }

    const system = await RankingSystem.findByPk(job.data.systemId);
    if (!system) {
      this.logger.error(`System not found ${job.data.systemId}`);
      throw new Error('System not found');
    }

    await this.pointService.createRankingPointforGame(system, game, {});
  }
}
