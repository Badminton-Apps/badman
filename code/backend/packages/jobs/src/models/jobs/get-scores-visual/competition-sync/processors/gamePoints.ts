import {
  BvlRankingCalc,
  EncounterCompetition,
  EventCompetition,
  Game,
  GamePlayer,
  LfbbRankingCalc,
  logger,
  OriginalRankingCalc,
  Player,
  RankingPlace,
  RankingPoint,
  RankingSystem,
  RankingSystems,
  StartVisualRankingDate,
  StepProcessor
} from '@badvlasim/shared';
import { Op } from 'sequelize';

export class CompetitionSyncPointProcessor extends StepProcessor {
  public event: EventCompetition;

  public async process(): Promise<void> {
    const subEvents = await this.event.getSubEvents({ transaction: this.transaction });
    let totalGames = 0;
    let totalWithoutPoints = 0;

    for (const subEvent of subEvents) {
      const groups = await subEvent.getGroups({
        include: [{ model: RankingSystem }],
        transaction: this.transaction
      });
      for (const group of groups) {
        for (const rankingSystem of group.systems) {
          const encounters = (
            await subEvent.getDraws({
              include: [{ model: EncounterCompetition }],
              transaction: this.transaction
            })
          ).map((s) => s.encounters);

          const games = await Game.findAll({
            attributes: ['id', 'winner', 'set1Team1', 'set2Team2', 'playedAt', 'gameType'],
            where: {
              linkId: {
                [Op.in]: encounters.map((encounter) => encounter?.map((e) => e.id)).flat()
              },
              playedAt: {
                [Op.gte]: StartVisualRankingDate
              }
            },
            include: [
              {
                model: RankingPoint,
                attributes: ['id'],
                required: false,
                where: { SystemId: rankingSystem.id }
              },
              {
                model: Player,
                attributes: ['id']
              }
            ],
            transaction: this.transaction
          });

          const gamesWithoutPoints = games.filter((game) => game.rankingPoints.length === 0);

          if (gamesWithoutPoints.length > 0) {
            const system = this.getSystem(rankingSystem);
            const gamePlayers = await GamePlayer.findAll({
              where: {
                gameId: {
                  [Op.in]: gamesWithoutPoints.map((game) => game.id)
                }
              },
              transaction: this.transaction
            });
            const players = await Player.findAll({
              where: {
                id: {
                  [Op.in]: gamePlayers.map((gp) => gp.playerId)
                }
              },
              include: [
                {
                  required: false,
                  model: RankingPlace,
                  where: {
                    SystemId: rankingSystem.id
                  }
                }
              ],
              transaction: this.transaction
            });

            const hash = new Map<string, Player>(players.map((e) => [e.id, e]));

            await system.calculateRankingPointsPerGameAsync(
              gamesWithoutPoints,
              hash,
              null,
              this.transaction
            );
          }

          totalGames += games.length;
          totalWithoutPoints += gamesWithoutPoints.length;
        }
      }
    }
    this.logger.debug(`${totalGames} games found, ${totalWithoutPoints} without points`);
  }

  private getSystem(rankingSystem: RankingSystem) {
    switch (rankingSystem.rankingSystem) {
      case RankingSystems.LFBB:
      case RankingSystems.VISUAL:
        return new LfbbRankingCalc(rankingSystem, false);
      case RankingSystems.BVL:
        return new BvlRankingCalc(rankingSystem, false);
      case RankingSystems.ORIGINAL:
        return new OriginalRankingCalc(rankingSystem, false);
    }
  }
}
