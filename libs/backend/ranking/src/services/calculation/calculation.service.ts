import {
  RankingGroup,
  RankingPlace,
  RankingPoint,
  RankingSystem,
} from '@badman/backend-database';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import moment, { Moment } from 'moment';
import { Op, Transaction } from 'sequelize';
import { PlaceService } from '../place';
import { PointsService } from '../points';

@Injectable()
export class CalculationService {
  private readonly logger = new Logger(CalculationService.name);

  constructor(
    private pointsService: PointsService,
    private placeService: PlaceService,
  ) {}

  public async simulation(
    systemId: string,
    fromDate?: Date | string,
    toDate?: Date | string,
    periods?: number,
    recalculatePoints = false,
    transaction?: Transaction,
  ) {
    try {
      const system = await RankingSystem.findByPk(systemId, {
        include: [{ model: RankingGroup }],
      });
      if (!system) {
        throw new NotFoundException(`${RankingSystem.name}: ${systemId}`);
      }

      this.logger.log(`Simulation for ${system.name}`);

      // if no periods are defined, calulate up untill last update interval
      const toDateM = moment(toDate);
      const fromDateM = moment(fromDate);
      if ((periods ?? 0) > 0) {
        for (let i = 0; i < (periods ?? 0); i++) {
          fromDateM.subtract(
            system.caluclationIntervalAmount,
            system.calculationIntervalUnit,
          );
        }
      }

      const updates = this._getUpdateIntervals(
        system,
        fromDateM,
        toDateM,
      );

      // I know t
      const minUpdate = moment(updates[0][0]);
      const maxUpdate = moment(updates[updates.length - 1][0]);

      this.logger.log(
        `Simulation for ${system.name} has ${
          updates.length
        } point updates planned, including ${
          updates.filter((u) => u[1]).length
        } ranking updates, between ${minUpdate?.format(
          'YYYY-MM-DD',
        )} and ${maxUpdate?.format('YYYY-MM-DD')}
        `,
      );

      await RankingPlace.destroy({
        where: {
          systemId: system.id,
          rankingDate: {
            [Op.between]: [minUpdate.toDate(), maxUpdate.toDate()],
          },
        },
        transaction,
      });

      await RankingPoint.destroy({
        where: {
          systemId: system.id,
          rankingDate: {
            [Op.between]: [minUpdate.toDate(), maxUpdate.toDate()],
          },
        },
        transaction,
      });

      for (const [updateDate, isUpdateNeeded] of updates) {
        this.logger.debug(
          `${moment(updateDate).format(
            'YYYY-MM-DD',
          )}, ${isUpdateNeeded}, ${recalculatePoints}`,
        );

        const startUpdate = moment();
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

        if (isUpdateNeeded) {
          // recalculate points for the next update because the ranking might have changed because of the updaet
          recalculatePoints = true;
        }

        const stopUpdate = moment();
        const duration = moment.duration(stopUpdate.diff(startUpdate));

        this.logger.log(
          `Simulation for ${
            system.name
          } finished in ${duration.asSeconds()} seconds`,
        );
      }

      if (transaction) {
        await transaction?.commit();
      }
      this.logger.log(`Simulation finished ${system.name}`);
    } catch (e) {
      if (transaction) {
        await transaction.rollback();
      }
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

    // sort updates by date
    updates.sort((a, b) => {
      if (a[0].getTime() > b[0].getTime()) {
        return 1;
      }
      if (a[0].getTime() < b[0].getTime()) {
        return -1;
      }
      return 0;
    });

    return updates;
  }
}
