import {
  EventTournament,
  Game,
  GamePlayerMembership,
  Player,
  RankingPlace,
  RankingPoint,
  RankingSystem,
} from '@badman/backend/database';
import { getSystemCalc } from '@badman/backend/ranking-calc';
import { Op } from 'sequelize';
import { StepProcessor } from '../../../../processing';
import { StartVisualRankingDate } from '@badman/backend/ranking';

export class TournamentSyncPointProcessor extends StepProcessor {
  public event: EventTournament;

  public async process(): Promise<void> {
    const subEvents = await this.event.getSubEventTournaments({
      transaction: this.transaction,
    });
    let totalGames = 0;
    let totalWithoutPoints = 0;

    for (const subEvent of subEvents) {
      const groups = await subEvent.getRankingGroups({
        include: [{ model: RankingSystem }],
        transaction: this.transaction,
      });
      for (const group of groups) {
        for (const rankingSystem of group.rankingSystems) {
          const draws = await subEvent.getDrawTournaments({
            transaction: this.transaction,
          });

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

          const gamesWithoutPoints = games.filter(
            (game) => game.rankingPoints.length === 0
          );

          if (gamesWithoutPoints.length > 0) {
            const system = getSystemCalc(rankingSystem);
            const gamePlayers = await GamePlayerMembership.findAll({
              where: {
                gameId: {
                  [Op.in]: gamesWithoutPoints.map((game) => game.id),
                },
              },
              transaction: this.transaction,
            });
            const players = await Player.findAll({
              where: {
                id: {
                  [Op.in]: gamePlayers.map((gp) => gp.playerId),
                },
              },
              include: [
                {
                  required: false,
                  model: RankingPlace,
                  where: {
                    systemId: rankingSystem.id,
                  },
                },
              ],
              transaction: this.transaction,
            });

            const hash = new Map<
              string,
              Player & {
                GamePlayerMembership: GamePlayerMembership;
              }
            >(
              players.map((e) => [
                e.id,
                e as Player & {
                  GamePlayerMembership: GamePlayerMembership;
                },
              ])
            );

            await system.calculateRankingPointsPerGameAsync(
              gamesWithoutPoints,
              hash,
              null,
              {
                transaction: this.transaction,
              }
            );
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
