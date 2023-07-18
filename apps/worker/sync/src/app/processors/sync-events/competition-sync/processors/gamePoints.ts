import {
  EncounterCompetition,
  EventCompetition,
  Game,
  Player,
  RankingPoint,
  RankingSystem,
} from '@badman/backend-database';

import { PointsService, StartVisualRankingDate } from '@badman/backend-ranking';
import { Op } from 'sequelize';
import { StepOptions, StepProcessor } from '../../../../processing';
import { Logger } from '@nestjs/common';

export class CompetitionSyncPointProcessor extends StepProcessor {
  public event?: EventCompetition;

  constructor(private pointService: PointsService, options?: StepOptions) {
    if (!options) {
      options = {};
    }
    options.logger =
      options.logger || new Logger(CompetitionSyncPointProcessor.name);
    super(options);
  }

  public async process(): Promise<void> {
    const subEvents =
      (await this.event?.getSubEventCompetitions({
        transaction: this.transaction,
      })) ?? [];
    let totalGames = 0;
    let totalWithoutPoints = 0;

    for (const subEvent of subEvents) {
      const index = subEvents.indexOf(subEvent);
      const progress = (index / subEvents.length) * 100;
      this.logger.debug(
        `Syncing points for ${subEvent.name} (${progress.toFixed(2)}%)`
      );

      const groups = await subEvent.getRankingGroups({
        include: [{ model: RankingSystem }],
        transaction: this.transaction,
      });

      for (const group of groups) {
        for (const rankingSystem of group.rankingSystems ?? []) {
          const encounters = (
            await subEvent.getDrawCompetitions({
              include: [{ model: EncounterCompetition }],
              transaction: this.transaction,
            })
          ).map((s) => s.encounterCompetitions);

          const games = await Game.findAll({
            attributes: [
              'id',
              'winner',
              'set1Team1',
              'set2Team2',
              'playedAt',
              'gameType',
            ],
            where: {
              linkId: {
                [Op.in]: encounters
                  .map((encounter) => encounter?.map((e) => e.id))
                  .flat(),
              },
              playedAt: {
                [Op.gte]: StartVisualRankingDate,
              },
            },
            include: [
              {
                model: RankingPoint,
                attributes: ['id'],
                required: false,
                where: { systemId: rankingSystem.id },
              },
              {
                model: Player,
                attributes: ['id'],
              },
            ],
            transaction: this.transaction,
          });

          const gamesWithoutPoints = games.filter(
            (game) => game.rankingPoints?.length === 0
          );

          if (gamesWithoutPoints.length > 0) {
            for (const game of gamesWithoutPoints) {
              await this.pointService.createRankingPointforGame(
                rankingSystem,
                game,
                {
                  createRankingPoints: true,
                  transaction: this.transaction,
                }
              );
            }
          }

          totalGames += games.length;
          totalWithoutPoints += gamesWithoutPoints.length;
        }
      }
    }
    this.logger.debug(
      `${totalGames} games found, ${totalWithoutPoints} without points`
    );
  }
}
