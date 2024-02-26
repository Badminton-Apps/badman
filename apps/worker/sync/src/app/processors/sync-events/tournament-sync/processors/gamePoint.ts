import {
  EventTournament,
  Game,
  Player,
  RankingPoint,
  RankingSystem,
} from '@badman/backend-database';
import { PointsService, StartVisualRankingDate } from '@badman/backend-ranking';
import { Op } from 'sequelize';
import { StepOptions, StepProcessor } from '../../../../processing';
import { Logger } from '@nestjs/common';

export class TournamentSyncPointProcessor extends StepProcessor {
  public event?: EventTournament;

  constructor(
    private pointService: PointsService,
    options?: StepOptions,
  ) {
    if (!options) {
      options = {};
    }

    options.logger = options.logger || new Logger(TournamentSyncPointProcessor.name);
    super(options);
  }

  public async process(): Promise<void> {
    const subEvents =
      (await this.event?.getSubEventTournaments({
        transaction: this.transaction,
      })) ?? [];
    let totalGames = 0;

    for (const subEvent of subEvents) {
      const groups = await subEvent.getRankingGroups({
        include: [{ model: RankingSystem }],
        transaction: this.transaction,
      });
      for (const group of groups) {
        for (const rankingSystem of group.rankingSystems ?? []) {
          const draws = await subEvent.getDrawTournaments({
            transaction: this.transaction,
          });

          const games = await Game.findAll({
            attributes: ['id', 'winner', 'set1Team1', 'set2Team2', 'playedAt', 'gameType'],
            where: {
              linkId: {
                [Op.in]: draws.map((e) => e.id),
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

          for (const game of games) {
            await this.pointService.createRankingPointforGame(rankingSystem, game, {
              transaction: this.transaction,
            });
          }

          totalGames += games.length;
        }
      }
    }

    this.logger.debug(`${totalGames} games found`);
  }
}
