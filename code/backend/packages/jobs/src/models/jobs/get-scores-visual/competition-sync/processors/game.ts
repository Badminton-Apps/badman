import {
  correctWrongPlayers,
  EncounterCompetition,
  Game,
  GamePlayer,
  GameStatus,
  GameType,
  Player,
  StepOptions,
  StepProcessor,
  XmlMatch,
  XmlMatchTypeID,
  XmlPlayer,
  XmlScoreStatus,
  XmlTournament
} from '@badvlasim/shared';
import moment from 'moment';
import { Op } from 'sequelize';
import { VisualService } from '../../../visualService';
import { EncounterStepData } from './encounter';

export class CompetitionSyncGameProcessor extends StepProcessor {
  public players: Map<string, Player>;
  public encounters: EncounterStepData[];

  private _games: Game[] = [];

  constructor(
    protected readonly visualTournament: XmlTournament,
    protected readonly visualService: VisualService,
    options?: StepOptions
  ) {
    super(options);
  }

  public async process(): Promise<Game[]> {
    const games = await Game.findAll({
      where: {
        linkId: {
          [Op.in]: this.encounters.map((encounter) => encounter?.encounter.id).flat()
        }
      },
      transaction: this.transaction
    });

    await Promise.all(
      this.encounters.map((e) => {
        const filtered = games.filter((g) => g.linkId === e.encounter.id);
        return this._processEncounter(e.encounter, e.internalId, filtered);
      })
    );

    return this._games;
  }

  private async _processEncounter(
    encounter: EncounterCompetition,
    internalId: number,
    games: Game[]
  ) {
    const isLastWeek = moment().subtract(1, 'week').isBefore(encounter.date);

    const visualMatch = (
      await this.visualService.getMatch(this.visualTournament.Code, internalId, !isLastWeek)
    ).filter((m) => !m || m?.Winner !== 0) as XmlMatch[];

    for (const xmlMatch of visualMatch) {
      let game = games.find(
        (r) => r.order === xmlMatch.MatchOrder && r.visualCode === `${xmlMatch.Code}`
      );

      let gameStatus = GameStatus.NORMAL;
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
        default:
        case XmlScoreStatus.Normal:
          gameStatus = GameStatus.NORMAL;
          break;
      }

      if (!game) {
        game = new Game({
          visualCode: xmlMatch.Code,
          winner: xmlMatch.Winner,
          gameType: this._getGameType(xmlMatch.MatchTypeID),
          order: xmlMatch.MatchOrder,
          linkId: encounter.id,
          linkType: 'competition',
          status: gameStatus,
          playedAt: encounter.date,
          set1Team1: xmlMatch?.Sets?.Set[0]?.Team1,
          set1Team2: xmlMatch?.Sets?.Set[0]?.Team2,
          set2Team1: xmlMatch?.Sets?.Set[1]?.Team1,
          set2Team2: xmlMatch?.Sets?.Set[1]?.Team2,
          set3Team1: xmlMatch?.Sets?.Set[2]?.Team1,
          set3Team2: xmlMatch?.Sets?.Set[2]?.Team2
        });
      } else {
        if (game.playedAt != encounter.date) {
          game.playedAt = encounter.date;
        }

        if (game.order != xmlMatch.MatchOrder) {
          game.order = xmlMatch.MatchOrder;
        }

        if (game.round != xmlMatch.RoundName) {
          game.round = xmlMatch.RoundName;
        }

        if (game.winner != xmlMatch.Winner) {
          game.winner = xmlMatch.Winner;
        }

        if (game.set1Team1 != xmlMatch?.Sets?.Set[0]?.Team1) {
          game.set1Team1 = xmlMatch?.Sets?.Set[0]?.Team1;
        }

        if (game.set1Team2 != xmlMatch?.Sets?.Set[0]?.Team2) {
          game.set1Team2 = xmlMatch?.Sets?.Set[0]?.Team2;
        }

        if (game.set2Team1 != xmlMatch?.Sets?.Set[1]?.Team1) {
          game.set2Team1 = xmlMatch?.Sets?.Set[1]?.Team1;
        }

        if (game.set2Team2 != xmlMatch?.Sets?.Set[1]?.Team2) {
          game.set2Team2 = xmlMatch?.Sets?.Set[1]?.Team2;
        }

        if (game.set3Team1 != xmlMatch?.Sets?.Set[2]?.Team1) {
          game.set3Team1 = xmlMatch?.Sets?.Set[2]?.Team1;
        }

        if (game.set3Team2 != xmlMatch?.Sets?.Set[2]?.Team2) {
          game.set3Team2 = xmlMatch?.Sets?.Set[2]?.Team2;
        }

        if (game.status !== gameStatus) {
          game.status = gameStatus;
        }
      }
      await game.save({ transaction: this.transaction });
      await GamePlayer.bulkCreate(this._createGamePlayers(xmlMatch, game), {
        transaction: this.transaction,
        ignoreDuplicates: true
      });
    }

    // Remove draw that are not in the xml
    const removedGames = games.filter((g) => g.visualCode == null);
    for (const removed of removedGames) {
      await removed.destroy({ transaction: this.transaction });
      games.splice(games.indexOf(removed), 1);
    }

    this._games = this._games.concat(games);
  }

  private _createGamePlayers(xmlMatch: XmlMatch, game: Game) {
    const gamePlayers = [];
    game.players = [];

    const t1p1 = this._getPlayer(xmlMatch?.Team1?.Player1);
    const t1p2 = this._getPlayer(xmlMatch?.Team1?.Player2);
    const t2p1 = this._getPlayer(xmlMatch?.Team2?.Player1);
    const t2p2 = this._getPlayer(xmlMatch?.Team2?.Player2);

    if (t1p1) {
      const gp = new GamePlayer({
        gameId: game.id,
        playerId: t1p1.id,
        team: 1,
        player: 1
      });
      gamePlayers.push(gp.toJSON());

      // Push to list
      game.players.push({
        ...t1p1.toJSON(),
        GamePlayer: gp
      } as Player & { GamePlayer: GamePlayer });
    }

    if (t1p2 && t1p2?.id !== t1p1?.id) {
      const gp = new GamePlayer({
        gameId: game.id,
        playerId: t1p2.id,
        team: 1,
        player: 2
      });
      gamePlayers.push(gp.toJSON());
      // Push to list
      game.players.push({
        ...t1p2.toJSON(),
        GamePlayer: gp
      } as Player & { GamePlayer: GamePlayer });
    }

    if (t2p1) {
      const gp = new GamePlayer({
        gameId: game.id,
        playerId: t2p1.id,
        team: 2,
        player: 1
      });
      gamePlayers.push(gp.toJSON());
      // Push to list
      game.players.push({
        ...t2p1.toJSON(),
        GamePlayer: gp
      } as Player & { GamePlayer: GamePlayer });
    }

    if (t2p2 && t2p2?.id !== t2p1?.id) {
      const gp = new GamePlayer({
        gameId: game.id,
        playerId: t2p2.id,
        team: 2,
        player: 2
      });
      gamePlayers.push(gp.toJSON());
      // Push to list
      game.players.push({
        ...t2p2.toJSON(),
        GamePlayer: gp
      } as Player & { GamePlayer: GamePlayer });
    }

    return gamePlayers;
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

  private _getPlayer(player: XmlPlayer) {
    let returnPlayer = this.players.get(`${player?.MemberID}`);

    if ((returnPlayer ?? null) == null && (player ?? null) != null) {
      // Search our map for unkowns
      const corrected = correctWrongPlayers({
        firstName: player.Firstname,
        lastName: player.Lastname
      });

      returnPlayer = [...this.players.values()].find(
        (p) =>
          (p.firstName === corrected.firstName && p.lastName === corrected.lastName) ||
          (p.firstName === corrected.lastName && p.lastName === corrected.firstName)
      );
    }
    return returnPlayer;
  }
}
