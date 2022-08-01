import { RankingGroup, RankingSystem } from '@badman/api/database';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { PlaceService } from '../place';
import { PointsService } from '../points';

@Injectable()
export class CalculationService {
  private readonly logger = new Logger(CalculationService.name);

  constructor(
    private sequelize: Sequelize,
    private pointsService: PointsService,
    private placeService: PlaceService
  ) {}

  public async simulation(
    systemId: string,
    calcDate?: Date | string,
    periods?: number,
    updateRanking = true,
    recalculatePoints = false
  ) {
    const transaction = await this.sequelize.transaction();
    try {
      const system = await RankingSystem.findByPk(systemId, {
        include: [{ model: RankingGroup }],
      });
      if (!system) { 
        throw new NotFoundException(`${RankingSystem.name}: ${systemId}`);
      }

      this.logger.log(`Simulation for ${system.name}`);

      // TODO: if start and stop are filled in do nmultiple updates

      if (recalculatePoints) {
        this.logger.verbose(`updating points`);
        await this.pointsService.createRankingPointsForPeriod({
          system,
          calcDate,
          options: {
            transaction,
          },
        });
      }

      await this.placeService.createUpdateRanking({
        system,
        calcDate,
        options: {
          transaction,
          updateRanking,
        },
      });

      await transaction.commit();
      this.logger.log(`Simulation finished ${system.name}`);
    } catch (e) {
      await transaction.rollback();
      this.logger.error(e);
      throw e;
    }
  }
}
