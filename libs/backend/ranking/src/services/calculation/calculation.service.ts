import {
  RankingGroup,
  RankingPoint,
  RankingSystem,
} from '@badman/backend-database';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { PlaceService } from '../place';
import { PointsService } from '../points';
import { Op } from 'sequelize';
import { Moment } from 'moment';
import moment from 'moment';

@Injectable()
export class CalculationService {
  private readonly logger = new Logger(CalculationService.name);

  constructor(
    private sequelize: Sequelize,
    private pointsService: PointsService,
    private placeService: PlaceService,
  ) {}

  public async simulation(
    systemId: string,
    calcDate?: Date | string,
    periods?: number,
    recalculatePoints = false,
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

      // first we need to rmeove all points after the calcDate
      await RankingPoint.destroy({
        where: {
          systemId,
          rankingDate: {
            [Op.gte]: calcDate,
          },
        },
        transaction,
      });

      // if no periods are defined, calulate up untill last update interval
      let toDate = moment();
      if ((periods ?? 0) > 0) {
        toDate = moment(calcDate);
        for (let i = 0; i < (periods ?? 0); i++) {
          toDate.add(
            system.caluclationIntervalAmount,
            system.calculationIntervalUnit, 
          );
        }
      }

      const updates = this._getUpdateIntervals(
        system,
        moment(calcDate),
        toDate,
      );

      for (const [updateDate, isUpdateNeeded] of updates) {
        if (recalculatePoints) { 
          await this.pointsService.createRankingPointsForPeriod({
            system,
            calcDate: updateDate,
            options: {
              transaction,
            },
          });
        }

        await this.placeService.createUpdateRanking({
          system,
          calcDate: updateDate,
          options: {
            transaction,
            updateRanking: isUpdateNeeded,
          },
        });
      }

      await transaction.commit();
      this.logger.log(`Simulation finished ${system.name}`);
    } catch (e) {
      await transaction.rollback();
      this.logger.error(e);
      throw e;
    }
  }

  private _getUpdateIntervals(system: RankingSystem, from: Moment, to: Moment) {
    let limit = 100;
    const lastUpdate = moment(system.updateIntervalAmountLastUpdate);
    const updates: [Date, boolean][] = [];

    if (!system.updateIntervalAmount || !system.updateIntervalUnit) {
      throw new Error('No update interval defined');
    }

    while (lastUpdate.isAfter(from) || limit <= 0) {
      lastUpdate
        .subtract(system.updateIntervalAmount, system.updateIntervalUnit)
        .startOf('month')
        .add(6, 'day')
        .startOf('isoWeek');
      limit--;
    }

    while (from.isBefore(to)) {
      const diff = lastUpdate.diff(from, system.updateIntervalUnit) * -1;
      const isUpdateNeeded = diff >= system.updateIntervalAmount;

      if (isUpdateNeeded) {
        lastUpdate
          .add(system.updateIntervalAmount, system.updateIntervalUnit)
          .startOf('month')
          .add(6, 'day')
          .startOf('isoWeek');
      }

      updates.push([from.toDate(), isUpdateNeeded]);

      from.add(
        system.caluclationIntervalAmount,
        system.calculationIntervalUnit,
      );
    }

    return updates;
  }
}
