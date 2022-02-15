import {
  correctWrongPlayers,
  DrawTournament,
  Game,
  GamePlayer,
  GameStatus,
  GameType,
  Player,
  StepOptions,
  StepProcessor,
  XmlMatch,
  XmlPlayer,
  XmlScoreStatus,
  XmlTournament
} from '@badvlasim/shared';
import moment from 'moment';
import { VisualService } from '../../../visualService';
import { DrawStepData } from './draw';
import { EventStepData } from './event';
import { SubEventStepData } from './subEvent';

export class TournamentSyncGameProcessor extends StepProcessor {
  public players: Map<string, Player>;
  public draws: DrawStepData[];
  public subEvents: SubEventStepData[];
  public event: EventStepData;
  private _games: Game[] = [];

  constructor(
    protected readonly visualTournament: XmlTournament,
    protected readonly visualService: VisualService,
    options?: StepOptions
  ) {
    super(options);
  }

  public async process(): Promise<Game[]> {
    await Promise.all(this.draws.map((e) => this._processSubevent(e.draw, e.internalId)));

    return this._games;
  }

  private async _processSubevent(draw: DrawTournament, internalId: number) {
    const games = await draw.getGames({
      transaction: this.transaction
      // include: [Player]
    });
    const subEvent = this.subEvents.find((sub) => draw.subeventId === sub.subEvent.id).subEvent;

    const visualMatch = (await this.visualService.getMatches(
      this.visualTournament.Code,
      internalId
    )) as XmlMatch[];

    for (const xmlMatch of visualMatch) {
      let game = games.find((r) => r.visualCode === `${xmlMatch.Code}`);

      const playedAt =
        xmlMatch.MatchTime != null
          ? moment(xmlMatch.MatchTime).toDate()
          : this.event.event.firstDay;

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
          // This is the case when the tournament didn't configured their score status
          if (
            // No scores
            xmlMatch?.Sets?.Set[0]?.Team1 == null &&
            xmlMatch?.Sets?.Set[0]?.Team2 == null &&
            
            // But not both players filled
            !(xmlMatch?.Team1?.Player1?.MemberID == null && xmlMatch?.Team2?.Player1?.MemberID == null) &&

            // And not both players null
            (xmlMatch?.Team2?.Player1?.MemberID !== null || xmlMatch?.Team2?.Player1?.MemberID !== null)
          ) {
            gameStatus = GameStatus.WALKOVER;
          } else {
            gameStatus = GameStatus.NORMAL;
          }
          break;
      }

      if (!game) {
        game = new Game({
          round: xmlMatch.RoundName,
          order: xmlMatch.MatchOrder,
          winner: xmlMatch.Winner,
          gameType: subEvent.gameType,
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
          set3Team2: xmlMatch?.Sets?.Set[2]?.Team2
        });

        await game.save({ transaction: this.transaction });
        await GamePlayer.bulkCreate(this._createGamePlayers(xmlMatch, game), {
          transaction: this.transaction,
          ignoreDuplicates: true
        });
      } else {
        if (game.playedAt != playedAt) {
          game.playedAt = playedAt;
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

        game.players = [];
        await game.save({ transaction: this.transaction });

        const t1p1 = this._getPlayer(xmlMatch?.Team1?.Player1);
        const t1p2 = this._getPlayer(xmlMatch?.Team1?.Player2);
        const t2p1 = this._getPlayer(xmlMatch?.Team2?.Player1);
        const t2p2 = this._getPlayer(xmlMatch?.Team2?.Player2);

        if (t1p1) {
          game.players.push({
            ...t1p1.toJSON(),
            GamePlayer: {
              gameId: game.id,
              playerId: t1p1.id,
              team: 1,
              player: 1
            }
          } as Player & { GamePlayer: GamePlayer });
        }

        if (game.gameType != GameType.S && t1p2) {
          game.players.push({
            ...t1p2.toJSON(),
            GamePlayer: {
              gameId: game.id,
              playerId: t1p2.id,
              team: 1,
              player: 2
            }
          } as Player & { GamePlayer: GamePlayer });
        }

        if (t2p1) {
          game.players.push({
            ...t2p1.toJSON(),
            GamePlayer: {
              gameId: game.id,
              playerId: t2p1.id,
              team: 2,
              player: 1
            }
          } as Player & { GamePlayer: GamePlayer });
        }

        if (game.gameType != GameType.S && t2p2) {
          game.players.push({
            ...t2p2.toJSON(),
            GamePlayer: {
              gameId: game.id,
              playerId: t2p2.id,
              team: 2,
              player: 2
            }
          } as Player & { GamePlayer: GamePlayer });
        }
      }
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
