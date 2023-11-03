import {
  DrawCompetition,
  DrawTournament,
  EncounterCompetition,
  Game,
  RankingGroup,
  RankingPoint,
  RankingSystem,
} from '@badman/backend-database';
import { Badminton, Simulation } from '@badman/backend-queue';
import { BelgiumFlandersPointsService } from '@badman/belgium-flanders-points';
import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Queue } from 'bull';
import moment from 'moment';
import { Op, Transaction } from 'sequelize';

/* TODO:
- [ ] We need to determine which point service / queue to trigger when running the general pointsservice

*/

@Injectable()
export class PointsService {
  private readonly _logger = new Logger(PointsService.name);

  constructor(
    @InjectQueue(Badminton.Belgium.Flanders.Points) private pointsQueue: Queue,
    private readonly belgiumFlandersPointsService: BelgiumFlandersPointsService,
  ) {}

  public async createRankingPointsForPeriod({
    system,
    calcDate,
    options,
  }: {
    system: RankingSystem;
    calcDate?: Date | string;
    options?: {
      createRankingPoints?: boolean;
      transaction?: Transaction;
    };
  }) {
    // Options
    const { transaction } = options ?? {};

    if (!system) {
      throw new NotFoundException(`${RankingSystem.name}`);
    }

    const start = moment(calcDate)
      .subtract(system.caluclationIntervalAmount, system.calculationIntervalUnit)
      .toDate();
    const stop = moment(calcDate).toDate();

    this._logger.log(`Calculatting points for ${system.name}`);

    const where = {
      systemId: system.id,
      rankingDate: {
        [Op.between]: [start.toISOString(), stop.toISOString()],
      },
    };

    const pointCount = await RankingPoint.count({ where, transaction });
    if (pointCount > 0) {
      const deleted = await RankingPoint.destroy({ where, transaction });
      this._logger.verbose(
        `Truncated ${deleted} RankingPoint for system ${
          where.systemId
        } and between ${start.toISOString()} and ${stop.toISOString()}`,
      );
    }

    const groups = await system.getRankingGroups();

    const { subEventsC, subEventsT } = await this._getSubEvents(
      groups,
      options?.transaction,
    );

    this._logger.debug(
      `SubEventsC: ${subEventsC.length}, SubEventsT: ${subEventsT.length}`,
    );

    const games = await this._getGames(
      subEventsC,
      subEventsT,
      {
        start,
        stop,
      },
      options,
    );

    this._logger.debug(`Games: ${games.length}`);

    // process the players in chunks of 500
    const chunkSize = 100;
    const startTime = new Date();
    for (let i = 0; i < games.length; i += chunkSize) {
      const jobs = [];
      const chunk = games.slice(i, i + chunkSize);
      for (const game of chunk) {
        const newJob = await this.pointsQueue.add(Simulation.CalculatePoint, {
          systemId: system.id,
          gameId: game.id,
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
    const average = duration.asMilliseconds() / games.length;
    this._logger.log(
      `Calculated ${
        games.length
      } places in ${duration.asSeconds()} seconds, average ${average} ms per game`,
    );
  }

  private async _getGames(
    subEventsC: string[],
    subEventsT: string[],
    { start, stop }: { start: Date; stop: Date },
    options?: { transaction?: Transaction },
  ) {
    const { transaction } = options ?? {};

    this._logger.debug(
      `Getting games between ${start.toISOString()} and ${stop.toISOString()}`,
    );

    const where = {
      playedAt: {
        [Op.between]: [start, stop],
      },
    };

    const gamesC = await Game.findAll({
      where,
      attributes: [
        'id',
        'playedAt',
        'gameType',
        'winner',
        'set1Team1',
        'set1Team2',
      ],
      include: [
        {
          required: true,
          model: EncounterCompetition,
          attributes: ['id'],
          include: [
            {
              model: DrawCompetition,
              required: true,
              attributes: ['id'],
              where: {
                subeventId: subEventsC,
              },
            },
          ],
        },
      ],
      transaction,
    });

    const gamesT = await Game.findAll({
      where,
      attributes: [
        'id',
        'playedAt',
        'gameType',
        'winner',
        'set1Team1',
        'set1Team2',
      ],
      include: [
        {
          model: DrawTournament,
          attributes: ['id'],
          required: true,
          where: {
            subeventId: subEventsT,
          },
        },
      ],
      transaction,
    });

    return [...gamesC, ...gamesT];
  }

  private async _getSubEvents(
    groups: RankingGroup[],
    transaction?: Transaction,
  ) {
    let subEventsC: string[] = [];
    let subEventsT: string[] = [];
    for (const group of groups) {
      const c = await group.getSubEventCompetitions({
        transaction,
        attributes: ['id'],
      });

      if ((c?.length ?? 0) > 0) {
        subEventsC = subEventsC.concat(c?.map((s) => s.id));
      }

      const t = await group.getSubEventTournaments({
        transaction,
        attributes: ['id'],
      });
      if ((t?.length ?? 0) > 0) {
        subEventsT = subEventsT.concat(t?.map((s) => s.id));
      }
    }

    return { subEventsC, subEventsT };
  }


  // using without queue
  public async createRankingPointforGame(
    system: RankingSystem,
    game: Game,
    options?: {
      transaction?: Transaction;
    },
  ) {
    return await this.belgiumFlandersPointsService.createRankingPointforGame(
      system,
      game,
      options,
    );
  }
}
