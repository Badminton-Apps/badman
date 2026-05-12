import { RankingGroup, RankingPoint, RankingSystem } from "@badman/backend-database";
import { getRankingPeriods } from "@badman/utils";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { EventEmitter } from "events";
import moment from "moment";
import { Op, Transaction } from "sequelize";
import { PlaceService } from "../place";
import { PointsService } from "../points";
import { UpdateRankingJob } from "@badman/backend-queue";

@Injectable()
export class CalculationService {
  private readonly logger = new Logger(CalculationService.name);

  constructor(
    private pointsService: PointsService,
    private placeService: PlaceService
  ) {
    EventEmitter.defaultMaxListeners = Infinity;
  }

  public async updateRanking(
    system: string | RankingSystem,
    args?: UpdateRankingJob,
    transaction?: Transaction
  ) {
    if (typeof system === "string") {
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

      // if no periods are defined, calulate from last update interval
      const toDateM = moment(toDate);
      const fromDateM = moment(fromDate ?? moment(system.calculationLastUpdate).add(1, "day"));
      if ((periods ?? 0) > 0) {
        for (let i = 0; i < (periods ?? 0); i++) {
          fromDateM.subtract(system.calculationIntervalAmount, system.calculationIntervalUnit);
        }
      }

      const updates = getRankingPeriods(system, fromDateM, toDateM);

      if (updates.length === 0) {
        this.logger.log(`Simulation for ${system.name}: no periods to update`);
        return;
      }

      const minUpdatePlace = moment(updates[0].date);
      const minUpdatePoints = moment(updates[0].date).subtract(
        system.periodAmount,
        system.periodUnit
      );
      const maxUpdate = moment(updates[updates.length - 1].date);

      const rankingUpdateCount = updates.filter((u) => u.updatePossible).length;
      this.logger.log(
        `Simulation for ${system.name}: ${updates.length} period(s) to process, ${rankingUpdateCount} with ranking updates, from ${minUpdatePlace?.format("YYYY-MM-DD")} to ${maxUpdate?.format("YYYY-MM-DD")}`
      );

      // If we changed the system, we might have to recalculate the points,
      // Setting recalculatePoints to true will delete all points and recalculate them
      if (recalculatePoints) {
        this.logger.log(
          `Recalculating all points for ${system.name} from ${minUpdatePoints?.format(
            "YYYY-MM-DD"
          )} to ${maxUpdate?.format("YYYY-MM-DD")}`
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
            `points for date: ${moment(minUpdatePoints).format("YYYY-MM-DD")}, ${period} / ${system.periodAmount}`
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

      for (const [index, { date, updatePossible }] of updates.entries()) {
        const periodNum = index + 1;
        const actions: string[] = [];
        if (calculatePoints) actions.push("points");
        if (calculatePlaces) actions.push("places");
        if (calculateRanking && updatePossible) actions.push("rankings");

        this.logger.log(
          `[${periodNum}/${updates.length}] Processing ${moment(date).format("YYYY-MM-DD")}: ${actions.join(", ")}`
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
          `[${periodNum}/${updates.length}] Completed ${moment(date).format("YYYY-MM-DD")} in ${duration.asSeconds().toFixed(1)}s`
        );
      }

      if (transaction) {
        await transaction?.commit();
      }
      this.logger.log(
        `Simulation for ${system.name} completed successfully: ${updates.length} period(s) processed`
      );
    } catch (e) {
      if (transaction) {
        await transaction.rollback();
      }
      const errorMsg = e instanceof Error ? e.message : String(e);
      this.logger.error(`Simulation for ${system.name} failed: ${errorMsg}`, e instanceof Error ? e.stack : "");
      throw e;
    } finally {
      system.runCurrently = false;
      await system.save();
    }
  }
}
