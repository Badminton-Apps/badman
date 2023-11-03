import { Player, RankingPlace, RankingSystem } from '@badman/backend-database';
import { Badminton, Simulation } from '@badman/backend-queue';
import { BelgiumFlandersPlacesService } from '@badman/belgium-flanders-places';
import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Queue } from 'bull';
import moment from 'moment';
import { Transaction } from 'sequelize';

/* TODO:
- [ ] We need to determine which place service / queue to trigger when running the general placeservice

*/

@Injectable()
export class PlaceService {
  private readonly _logger = new Logger(PlaceService.name);

  constructor(
    @InjectQueue(Badminton.Belgium.Flanders.Places) private placesQueue: Queue,
    private readonly belgiumFlandersPlaceService: BelgiumFlandersPlacesService,
  ) {}

  /**
   * Does a new ranking place for period
   * @param param0
   */
  public async createUpdateRanking({
    system,
    calcDate,
    options,
  }: {
    system: RankingSystem;
    calcDate?: Date | string;
    options?: {
      updateRanking?: boolean;
      transaction?: Transaction;
    };
  }) {
    const { transaction } = options ?? {};

    if (!system) {
      throw new NotFoundException(`${RankingSystem.name}`);
    }
    this._logger.log(`Calculatting places for ${system.name}, ${calcDate}`);

    const start = moment(calcDate)
      .subtract(system.periodAmount, system.periodUnit)
      .toDate();
    const stop = moment(calcDate).toDate();

    const where = {
      systemId: system.id,
      rankingDate: stop.toISOString(),
    };

    const pointCount = await RankingPlace.count({ where, transaction });
    if (pointCount > 0) {
      const deleted = await RankingPlace.destroy({ where, transaction });
      this._logger.verbose(
        `Truncated ${deleted} RankingPlace for system ${where.systemId} and date ${where.rankingDate}`,
      );
    }

    const players = await this._getPlayers({ transaction });

    // process the players in chunks of 500
    const chunkSize = 100;
    const startTime = new Date();
    for (let i = 0; i < players.length; i += chunkSize) {
      const jobs = [];
      const chunk = players.slice(i, i + chunkSize);
      for (const player of chunk) {
        const newJob = await this.placesQueue.add(Simulation.CalculatePlace, {
          systemId: system.id,
          playerId: player.id,
          calcDate,
          start: start.toISOString(),
          stop: stop.toISOString(),
          updateRanking: options?.updateRanking ?? false,
        });

        jobs.push(newJob);
      }

      await Promise.all(jobs.map((job) => job.finished()));

      // remove all jobs from queue
      await Promise.all(jobs.map((job) => job.remove()));
    }

    // calculate average per person
    const endTime = new Date();
    const duration = moment.duration(moment(endTime).diff(moment(startTime)));
    const average = duration.asMilliseconds() / players.length;
    this._logger.log(
      `Calculated ${
        players.length
      } places in ${duration.asSeconds()} seconds, average ${average} ms per player`,
    );

    if (options?.updateRanking) {
      system.updateIntervalAmountLastUpdate = stop;
    }

    system.caluclationIntervalLastUpdate = stop;
    await system.save({ transaction });
  }

  private async _getPlayers(options?: { transaction?: Transaction }) {
    const { transaction } = options ?? {};

    // we require lastRankingPlace to skip players who have never played
    return await Player.findAll({
      attributes: ['id'],
      where: {
        competitionPlayer: true,
      },
      transaction,
    });
  }
  
  // using without queue
  public async newPlaceForPlayer(
    player: Player,
    system: RankingSystem,
    stop: Date,
    start: Date,
    options:
      | {
          updateRanking?: boolean | undefined;
          transaction?: Transaction | undefined;
        }
      | undefined,
  ) {
    this.belgiumFlandersPlaceService.newPlaceForPlayer(
      player,
      system,
      stop,
      start,
      options,
    );
  }
}
