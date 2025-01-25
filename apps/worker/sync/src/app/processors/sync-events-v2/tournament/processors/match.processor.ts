import {
  DrawTournament,
  Game,
  GamePlayerMembership,
  Player,
  RankingSystem,
  SubEventTournament,
} from '@badman/backend-database';
import { Sync, SyncQueue, TransactionManager } from '@badman/backend-queue';
import { PointsService } from '@badman/backend-ranking';
import { VisualService, XmlMatch, XmlPlayer, XmlScoreStatus } from '@badman/backend-visual';
import { GameStatus, getRankingProtected } from '@badman/utils';
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import moment from 'moment-timezone';
import { Op, Transaction } from 'sequelize';

@Processor({
  name: SyncQueue,
})
export class MatchTournamentProcessor {
  private readonly logger = new Logger(MatchTournamentProcessor.name);

  constructor(
    private readonly _transactionManager: TransactionManager,
    private readonly _visualService: VisualService,
    private readonly _pointService: PointsService,
  ) {}

  @Process(Sync.ProcessSyncTournamentMatch)
  async ProcessSyncTournamentMatch(
    job: Job<{
      // transaction
      transactionId: string;

      // provide or direed
      eventCode: string;
      subEventId: string;
      rankingSystemId: string;
      drawId: string;

      // one or the other
      gameId: string;
      gameCode: number;

      // options
    }>,
  ): Promise<void> {
    const transaction = await this._transactionManager.getTransaction(job.data.transactionId);

    let game: Game;
    if (job.data.gameId) {
      game = await Game.findOne({
        where: {
          id: job.data.gameId,
        },
        transaction,
      });
    }

    const draw = await DrawTournament.findByPk(job.data.drawId || game.linkId, {
      transaction,
    });
    if (!draw) {
      throw new Error('Draw not found');
    }
    const subEvent = await SubEventTournament.findByPk(job.data.subEventId || draw.subeventId, {
      transaction,
    });
    if (!subEvent) {
      throw new Error('SubEvent not found');
    }

    if (!job.data.eventCode) {
      const event = await subEvent.getEvent();
      if (!event) {
        throw new Error('Event not found');
      }

      job.data.eventCode = event.visualCode;
    }

    if (!job.data.eventCode) {
      throw new Error('Event code is required');
    }

    if (!game && job.data.gameCode) {
      game = await Game.findOne({
        where: {
          visualCode: job.data.gameCode.toString(),
          linkId: draw.id,
        },
        transaction,
      });
    }

    if (!job.data.rankingSystemId) {
      job.data.rankingSystemId = (
        await RankingSystem.findOne({
          where: {
            primary: true,
          },
        })
      ).id;
    }

    // delete the data and reuse the guid
    const gameId = game?.id;
    const gameCode = game?.visualCode || job.data.gameCode.toString();
    if (game) {
      this.logger.debug(`Deleting game`);
      await game.destroy({ transaction });

      // also delete game players memberships
      await GamePlayerMembership.destroy({
        where: {
          gameId: game.id,
        },
        transaction,
      });
    }

    if (!gameCode) {
      throw new Error('match code is required');
    }

    // we fetch it via the draw because bye's aren't in the match detail
    const xmlMatches = await this._visualService.getMatches(
      job.data.eventCode,
      draw.visualCode,
      true,
    );
    const xmlMatch = xmlMatches.find((m) => m.Code.toString() === gameCode.toString()) as XmlMatch;
    if (!xmlMatch) {
      throw new Error('match not found');
    }

    if (!xmlMatch.Sets) {
      xmlMatch.Sets = { Set: [] };
    }

    if (!Array.isArray(xmlMatch?.Sets?.Set)) {
      xmlMatch.Sets.Set = [xmlMatch.Sets.Set];
    }

    const playedAt =
      xmlMatch.MatchTime != null ? moment.tz(xmlMatch.MatchTime, 'Europe/Brussels').toDate() : null;

    let gameStatus: GameStatus;
    switch (xmlMatch.ScoreStatus) {
      case XmlScoreStatus.Retirement:
        gameStatus = GameStatus.RETIREMENT;
        break;
      case XmlScoreStatus.Disqualified:
        gameStatus = GameStatus.DISQUALIFIED;
        break;
      case XmlScoreStatus['No Match']:
        gameStatus = GameStatus.NO_MATCH;
        break;
      case XmlScoreStatus.Walkover:
        gameStatus = GameStatus.WALKOVER;
        break;
      case XmlScoreStatus.Normal:
      default:
        // This is the case when the tournament didn't configured their score status
        if (
          // No scores
          xmlMatch?.Sets?.Set[0]?.Team1 == null &&
          xmlMatch?.Sets?.Set[0]?.Team2 == null &&
          // But not both players filled
          !(
            xmlMatch?.Team1?.Player1?.MemberID == null && xmlMatch?.Team2?.Player1?.MemberID == null
          ) &&
          // And not both players null
          (xmlMatch?.Team2?.Player1?.MemberID !== null ||
            xmlMatch?.Team2?.Player2?.MemberID !== null)
        ) {
          gameStatus = GameStatus.WALKOVER;
        } else {
          gameStatus = GameStatus.NORMAL;
        }
        break;
    }

    game = new Game({
      id: gameId,
      round: xmlMatch.RoundName,
      order: xmlMatch.MatchOrder,
      winner: xmlMatch.Winner,
      gameType: subEvent?.gameType,
      visualCode: xmlMatch.Code,
      linkId: draw.id,
      linkType: 'tournament',
      status: gameStatus,
      playedAt,
      set1Team1: xmlMatch?.Sets?.Set[0]?.Team1,
      set1Team2: xmlMatch?.Sets?.Set[0]?.Team2,
      set2Team1: xmlMatch?.Sets?.Set[1]?.Team1,
      set2Team2: xmlMatch?.Sets?.Set[1]?.Team2,
      set3Team1: xmlMatch?.Sets?.Set[2]?.Team1,
      set3Team2: xmlMatch?.Sets?.Set[2]?.Team2,
    });

    await game.save({ transaction });
    const system = await RankingSystem.findByPk(job.data.rankingSystemId, {
      transaction,
    });

    const memberships = await this._createGamePlayers(xmlMatch, game, system, transaction);
    await GamePlayerMembership.bulkCreate(memberships, {
      transaction,
      updateOnDuplicate: ['single', 'double', 'mix'],
    });

    await this._pointService.createRankingPointforGame(system, game, { transaction });

    this.logger.debug(`Game ${game.id} created`);
  }

  private async _createGamePlayers(
    xmlMatch: XmlMatch,
    game: Game,
    system: RankingSystem,
    transaction: Transaction,
  ) {
    const gamePlayers = [];
    game.players = [];

    const t1p1 = await this._getPlayer(xmlMatch?.Team1?.Player1);
    const t1p2 = await this._getPlayer(xmlMatch?.Team1?.Player2);
    const t2p1 = await this._getPlayer(xmlMatch?.Team2?.Player1);
    const t2p2 = await this._getPlayer(xmlMatch?.Team2?.Player2);

    if (t1p1) {
      const rankingt1p1 = await t1p1.getRankingPlaces({
        where: {
          systemId: system.id,
          rankingDate: {
            [Op.lte]: game.playedAt,
          },
        },
        order: [['rankingDate', 'DESC']],
        limit: 1,
        transaction,
      });

      const place = getRankingProtected(rankingt1p1?.[0], system);

      const gp = new GamePlayerMembership({
        gameId: game.id,
        playerId: t1p1.id,
        team: 1,
        player: 1,
        single: place.single,
        double: place.double,
        mix: place.mix,
        systemId: system.id,
      });
      gamePlayers.push(gp.toJSON());

      // Push to list
      game.players.push({
        ...t1p1.toJSON(),
        GamePlayerMembership: gp,
      } as Player & { GamePlayerMembership: GamePlayerMembership });
    }

    if (t1p2 && t1p2?.id !== t1p1?.id) {
      const rankingt1p2 = await t1p2.getRankingPlaces({
        where: {
          systemId: system.id,
          rankingDate: {
            [Op.lte]: game.playedAt,
          },
        },
        order: [['rankingDate', 'DESC']],
        limit: 1,
        transaction,
      });

      const place = getRankingProtected(rankingt1p2?.[0], system);

      const gp = new GamePlayerMembership({
        gameId: game.id,
        playerId: t1p2.id,
        team: 1,
        player: 2,
        single: place.single,
        double: place.double,
        mix: place.mix,
        systemId: system.id,
      });
      gamePlayers.push(gp.toJSON());
      // Push to list
      game.players.push({
        ...t1p2.toJSON(),
        GamePlayerMembership: gp,
      } as Player & { GamePlayerMembership: GamePlayerMembership });
    }

    if (t2p1) {
      const rankingt2p1 = await t2p1.getRankingPlaces({
        where: {
          systemId: system.id,
          rankingDate: {
            [Op.lte]: game.playedAt,
          },
        },
        order: [['rankingDate', 'DESC']],
        limit: 1,
        transaction,
      });

      const place = getRankingProtected(rankingt2p1?.[0], system);

      const gp = new GamePlayerMembership({
        gameId: game.id,
        playerId: t2p1.id,
        team: 2,
        player: 1,
        single: place.single,
        double: place.double,
        mix: place.mix,
        systemId: system.id,
      });
      gamePlayers.push(gp.toJSON());
      // Push to list
      game.players.push({
        ...t2p1.toJSON(),
        GamePlayerMembership: gp,
      } as Player & { GamePlayerMembership: GamePlayerMembership });
    }

    if (t2p2 && t2p2?.id !== t2p1?.id) {
      const rankingtt2p2 = await t2p2.getRankingPlaces({
        where: {
          systemId: system.id,
          rankingDate: {
            [Op.lte]: game.playedAt,
          },
        },
        order: [['rankingDate', 'DESC']],
        limit: 1,
        transaction,
      });

      const place = getRankingProtected(rankingtt2p2?.[0], system);

      const gp = new GamePlayerMembership({
        gameId: game.id,
        playerId: t2p2.id,
        team: 2,
        player: 2,
        single: place.single,
        double: place.double,
        mix: place.mix,
        systemId: system.id,
      });
      gamePlayers.push(gp.toJSON());
      // Push to list
      game.players.push({
        ...t2p2.toJSON(),
        GamePlayerMembership: gp,
      } as Player & { GamePlayerMembership: GamePlayerMembership });
    }

    return gamePlayers;
  }

  private async _getPlayer(player?: XmlPlayer) {
    let returnPlayer;

    if (player?.MemberID) {
      returnPlayer = await Player.findOne({
        where: {
          memberId: player.MemberID.toString(),
        },
      });
    }

    if (!returnPlayer && player?.Firstname && player?.Lastname) {
      returnPlayer = await Player.findOne({
        where: {
          firstName: player.Firstname,
          lastName: player.Lastname,
        },
      });
    }

    return returnPlayer;
  }
}
