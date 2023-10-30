import { Player, RankingSystem } from '@badman/backend-database';
import {
  Badminton,
  Simulation,
  SimulationPlaceJob,
} from '@badman/backend-queue';
import { BelgiumFlandersPlacesService } from '@badman/belgium-flanders-places';
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

@Processor({
  name: Badminton.Belgium.Flanders.Places,
})
export class PlacesProcessor {
  private readonly logger = new Logger(PlacesProcessor.name);
  constructor(private readonly placesService: BelgiumFlandersPlacesService) {}

  @Process({
    name: Simulation.CalculatePlace,
  })
  async calulatePlace(job: Job<SimulationPlaceJob>) {
    const player = await Player.findByPk(job.data.playerId);
    if (!player) {
      this.logger.error(`Player not found ${job.data.playerId}`);
      throw new Error('Player not found');
    }

    const system = await RankingSystem.findByPk(job.data.systemId);
    if (!system) {
      this.logger.error(`System not found ${job.data.systemId}`);
      throw new Error('System not found');
    }

    await this.placesService.newPlaceForPlayer(
      player,
      system,
      new Date(job.data.stop),
      new Date(job.data.start),
      {
        updateRanking: job.data.updateRanking,
      },
    );
  }
}
