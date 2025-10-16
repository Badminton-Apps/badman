import {
  DrawCompetition,
  Game,
  GamePlayerMembership,
  Player,
  RankingSystem,
  SubEventCompetition,
} from "@badman/backend-database";
import { Sync, SyncQueue, TransactionManager } from "@badman/backend-queue";
import { PointsService } from "@badman/backend-ranking";
import {
  VisualService,
  XmlMatch,
  XmlMatchTypeID,
  XmlPlayer,
  XmlScoreStatus,
} from "@badman/backend-visual";
import { GameStatus, GameType, getRankingProtected } from "@badman/utils";
import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";
import moment from "moment-timezone";
import { Op, Transaction } from "sequelize";
import { WinnerMappingService } from "../../../../utils";

@Processor({
  name: SyncQueue,
})
export class GameCompetitionProcessor {
  private readonly logger = new Logger(GameCompetitionProcessor.name);

  constructor(
    private readonly _transactionManager: TransactionManager,
    private readonly _visualService: VisualService,
    private readonly _pointService: PointsService,
    private readonly _winnerMappingService: WinnerMappingService
  ) {}

  @Process(Sync.ProcessSyncCompetitionGame)
  async ProcessSyncCompetitionGame(
    job: Job<{
      // transaction
      transactionId: string;

      // provide or derived
      eventCode: string;
      subEventId: string;
      rankingSystemId: string;
      drawId: string;

      // one or the other
      gameId: string;
      gameCode: number;

      // options
      options: {
        deleteMatches?: boolean;
      };
    }>
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

    const draw = await DrawCompetition.findByPk(job.data.drawId || game.linkId, {
      transaction,
    });
    if (!draw) {
      throw new Error("Draw not found");
    }
    const subEvent = await SubEventCompetition.findByPk(job.data.subEventId || draw.subeventId, {
      transaction,
    });
    if (!subEvent) {
      throw new Error("SubEvent not found");
    }

    if (!job.data.eventCode) {
      const event = await subEvent.getEventCompetition();
      if (!event) {
        throw new Error("Event not found");
      }

      job.data.eventCode = event.visualCode;
    }

    if (!job.data.eventCode) {
      throw new Error("Event code is required");
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
    const gameId = game?.id || job.data.gameId;
    const gameCode = game?.visualCode || job.data.gameCode.toString();
    if (game && job.data.options?.deleteMatches) {
      this.logger.debug(`Deleting game`);
      await game.destroy({ transaction });
    }

    if (!gameCode) {
      throw new Error("game code is required");
    }

    // we fetch it via the draw because bye's aren't in the game detail
    const xmlGames = await this._visualService.getGames(job.data.eventCode, draw.visualCode, true);
    const xmlGame = xmlGames.find((m) => m.Code.toString() === gameCode.toString()) as XmlMatch;
    if (!xmlGame) {
      throw new Error("game not found");
    }

    if (!xmlGame.Sets) {
      xmlGame.Sets = { Set: [] };
    }

    if (!Array.isArray(xmlGame?.Sets?.Set)) {
      xmlGame.Sets.Set = [xmlGame.Sets.Set];
    }

    const playedAt =
      xmlGame.MatchTime != null ? moment.tz(xmlGame.MatchTime, "Europe/Brussels").toDate() : null;

    let gameStatus: GameStatus;
    switch (xmlGame.ScoreStatus) {
      case XmlScoreStatus.Retirement:
        gameStatus = GameStatus.RETIREMENT;
        break;
      case XmlScoreStatus.Disqualified:
        gameStatus = GameStatus.DISQUALIFIED;
        break;
      case XmlScoreStatus["No Match"]:
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
          xmlGame?.Sets?.Set[0]?.Team1 == null &&
          xmlGame?.Sets?.Set[0]?.Team2 == null &&
          // But not both players filled
          !(
            xmlGame?.Team1?.Player1?.MemberID == null && xmlGame?.Team2?.Player1?.MemberID == null
          ) &&
          // And not both players null
          (xmlGame?.Team2?.Player1?.MemberID !== null || xmlGame?.Team2?.Player2?.MemberID !== null)
        ) {
          gameStatus = GameStatus.WALKOVER;
        } else {
          gameStatus = GameStatus.NORMAL;
        }
        break;
    }

    // Capture original winner state before any updates
    const originalWinner = game?.winner;

    if (!game) {
      game = new Game();
    }

    if (gameId) {
      game.id = gameId;
    }

    // Only update round and order if our database has no existing data
    if (game.round == null && xmlGame.RoundName != null) {
      game.round = xmlGame.RoundName;
    }
    if (game.order == null && xmlGame.MatchOrder != null) {
      game.order = xmlGame.MatchOrder;
    }

    // Only update winner if toernooi.nl has data OR if we have no existing data
    if (xmlGame.Winner != null || game.winner == null) {
      game.winner = this._winnerMappingService.mapToInternalValue(xmlGame.Winner);
    }
    game.gameType = this._getGameType(xmlGame.MatchTypeID);
    game.visualCode = xmlGame.Code;
    game.linkId = draw.id;
    game.linkType = "tournament";
    game.status = gameStatus;

    // Only update playedAt if our database has no existing data
    if (game.playedAt == null && playedAt != null) {
      game.playedAt = playedAt;
    }

    // Only update set scores if toernooi.nl has data or if our system has no data
    // This prevents overwriting existing scores with empty data from toernooi.nl
    if (xmlGame?.Sets?.Set[0]?.Team1 != null || game.set1Team1 == null) {
      game.set1Team1 = xmlGame?.Sets?.Set[0]?.Team1;
    }
    if (xmlGame?.Sets?.Set[0]?.Team2 != null || game.set1Team2 == null) {
      game.set1Team2 = xmlGame?.Sets?.Set[0]?.Team2;
    }
    if (xmlGame?.Sets?.Set[1]?.Team1 != null || game.set2Team1 == null) {
      game.set2Team1 = xmlGame?.Sets?.Set[1]?.Team1;
    }
    if (xmlGame?.Sets?.Set[1]?.Team2 != null || game.set2Team2 == null) {
      game.set2Team2 = xmlGame?.Sets?.Set[1]?.Team2;
    }
    if (xmlGame?.Sets?.Set[2]?.Team1 != null || game.set3Team1 == null) {
      game.set3Team1 = xmlGame?.Sets?.Set[2]?.Team1;
    }
    if (xmlGame?.Sets?.Set[2]?.Team2 != null || game.set3Team2 == null) {
      game.set3Team2 = xmlGame?.Sets?.Set[2]?.Team2;
    }

    await game.save({ transaction });
    const system = await RankingSystem.findByPk(job.data.rankingSystemId, {
      transaction,
    });

    const memberships = await this._createGamePlayers(xmlGame, game, system, transaction);

    // Only update player memberships if game didn't have a winner BEFORE this sync
    // If original game had no winner (null/0), create/update memberships
    // If original game already had a winner, skip (memberships already exist)
    if (originalWinner == null || originalWinner === 0) {
      // First destroy any existing memberships to prevent duplicates
      await GamePlayerMembership.destroy({
        where: { gameId: game.id },
        transaction,
      });

      // Then create new memberships
      await GamePlayerMembership.bulkCreate(memberships, {
        transaction,
        updateOnDuplicate: ["single", "double", "mix"],
      });
    } else {
      this.logger.debug(
        `Skipping player membership update for game ${game.id} - game already had winner: ${originalWinner}`
      );
    }

    await this._pointService.createRankingPointforGame(system, game, { transaction });

    this.logger.debug(`Game ${game.id} created`);
  }

  private async _createGamePlayers(
    xmlGame: XmlMatch,
    game: Game,
    system: RankingSystem,
    transaction: Transaction
  ) {
    const gamePlayers = [];
    game.players = [];

    const t1p1 = await this._getPlayer(xmlGame?.Team1?.Player1);
    const t1p2 = await this._getPlayer(xmlGame?.Team1?.Player2);
    const t2p1 = await this._getPlayer(xmlGame?.Team2?.Player1);
    const t2p2 = await this._getPlayer(xmlGame?.Team2?.Player2);

    if (t1p1) {
      const rankingt1p1 = await t1p1.getRankingPlaces({
        where: {
          systemId: system.id,
          rankingDate: {
            [Op.lte]: game.playedAt,
          },
        },
        order: [["rankingDate", "DESC"]],
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
        order: [["rankingDate", "DESC"]],
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
        order: [["rankingDate", "DESC"]],
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
        order: [["rankingDate", "DESC"]],
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

  private _getGameType(type: XmlMatchTypeID): GameType {
    switch (type) {
      case XmlMatchTypeID.MS:
      case XmlMatchTypeID.WS:
      case XmlMatchTypeID.Single:
        return GameType.S;

      case XmlMatchTypeID.MD:
      case XmlMatchTypeID.WD:
        return GameType.D;

      case XmlMatchTypeID.XD:
      case XmlMatchTypeID.Double:
        return GameType.MX;

      default:
        throw new Error(`Type not found, ${type}`);
    }
  }
}
