import {
  RankingGroup,
  RankingPlace,
  RankingPoint,
  RankingSystem,
} from '@badman/backend-database';
import { getRankingPeriods } from '@badman/utils';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import moment from 'moment';
import { Op, Transaction } from 'sequelize';
import { PlaceService } from '../place';
import { PointsService } from '../points';
import { EventEmitter } from 'events';

@Injectable()
export class CalculationService {
  private readonly logger = new Logger(CalculationService.name);

  constructor(
    private pointsService: PointsService,
    private placeService: PlaceService,
  ) {
    EventEmitter.defaultMaxListeners = Infinity;
  }

  public async updateRanking(
    system: string | RankingSystem,
    args: {
      fromDate?: Date | string;
      toDate?: Date | string;
      periods?: number;
      recalculatePoints?: boolean;
      calculatePoints?: boolean;
      calculatePlaces?: boolean;
      calculateRanking?: boolean;
      transaction?: Transaction;
    },
  ) {
    if (typeof system === 'string') {
      system = (await RankingSystem.findByPk(system, {
        include: [{ model: RankingGroup }],
      })) as RankingSystem;
    }

    const {
      fromDate,
      toDate,
      periods,
      recalculatePoints,
      calculatePlaces,
      calculatePoints,
      calculateRanking,
      transaction,
    } = {
      // Default values
      recalculatePoints: false,
      calculatePoints: true,
      calculatePlaces: true,
      calculateRanking: true,
      // Args
      ...args,
    };

    if (!system) {
      throw new NotFoundException(`${RankingSystem.name} not found`);
    }
    system.runCurrently = true;
    await system.save();

    try {
      this.logger.log(`Simulation for ${system.name}`);

      // if no periods are defined, calulate up untill last update interval
      const toDateM = moment(toDate);
      const fromDateM = moment(
        fromDate || system.updateIntervalAmountLastUpdate,
      );
      if ((periods ?? 0) > 0) {
        for (let i = 0; i < (periods ?? 0); i++) {
          fromDateM.subtract(
            system.calculationIntervalAmount,
            system.calculationIntervalUnit,
          );
        }
      }

      const updates = getRankingPeriods(system, fromDateM, toDateM);

      if (updates.length === 0) {
        this.logger.log(`Simulation finished ${system.name}`);
        return;
      }

      const minUpdatePlace = moment(updates[0].date);
      const minUpdatePoints = moment(updates[0].date).subtract(
        system.periodAmount,
        system.periodUnit,
      );
      const maxUpdate = moment(updates[updates.length - 1].date);

      this.logger.log(
        `Simulation for ${system.name} has ${
          updates.length
        } point updates planned, including ${
          updates.filter((u) => u.updatePossible).length
        } ranking updates, between ${minUpdatePlace?.format(
          'YYYY-MM-DD',
        )} and ${maxUpdate?.format('YYYY-MM-DD')}
        `,
      );

      // If we changed the system, we might have to recalculate the points,
      // Setting recalculatePoints to true will delete all points and recalculate them
      if (recalculatePoints) {
        this.logger.verbose(
          `Recalculate points for ${
            system.name
          }, between ${minUpdatePoints?.format(
            'YYYY-MM-DD',
          )} and ${maxUpdate?.format('YYYY-MM-DD')}`,
        );
        await RankingPoint.destroy({
          where: {
            systemId: system.id,
            rankingDate: {
              [Op.between]: [minUpdatePoints.toDate(), maxUpdate.toDate()],
            },
          },
          transaction,
        });

        for (let period = 0; period < (system.periodAmount ?? 0); period++) {
          this.logger.debug(
            `points for date: ${moment(minUpdatePoints).format(
              'YYYY-MM-DD',
            )}, ${period} / ${system.periodAmount}`,
          );

          await this.pointsService.createRankingPointsForPeriod({
            system,
            calcDate: minUpdatePoints.toDate(),
            options: {
              transaction,
            },
          });

          minUpdatePoints.add(1, system.periodUnit);
        }
      }

      if (calculatePlaces) {
        await RankingPlace.destroy({
          where: {
            systemId: system.id,
            rankingDate: {
              [Op.between]: [minUpdatePlace.toDate(), maxUpdate.toDate()],
            },
          },
          transaction,
        });
      }

      for (const [index, { date, updatePossible }] of updates.entries()) {
        this.logger.debug(
          `points and ranking for date: ${moment(date).format(
            'YYYY-MM-DD',
          )}, ${updatePossible}, ${index} / ${
            updates.length
          }, calculateRanking: ${calculateRanking}, calculatePlaces: ${calculatePlaces}, calculatePoints: ${calculatePoints}`,
        );

        const startUpdate = moment();
        if (calculatePoints) {
          await this.pointsService.createRankingPointsForPeriod({
            system,
            calcDate: date.toDate(),
            options: {
              transaction,
            },
          });
        }

        if (calculatePlaces) {
          await this.placeService.createUpdateRanking({
            system,
            calcDate: date.toDate(),
            options: {
              transaction,
              updateRanking: calculateRanking ? updatePossible : false,
            },
          });
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
    } finally {
      system.runCurrently = false;
      await system.save();
    }
  }
}
