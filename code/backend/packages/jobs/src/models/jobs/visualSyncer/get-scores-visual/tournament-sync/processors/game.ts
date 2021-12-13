import {
  Game,
  GamePlayer,
  GameType,
  logger,
  Player,
  XmlMatch,
  XmlMatchTypeID,
  XmlTournament
} from '@badvlasim/shared';
import moment from 'moment';
import { Transaction } from 'sequelize';
import { StepProcessor } from '../../../../../../utils/step-processor';
import { VisualService } from '../../../../../../utils/visualService';
import { DrawStepData } from './draw';
import { EventStepData } from './event';
import { SubEventStepData } from './subEvent';

export class TournamentSyncGameProcessor extends StepProcessor {
  public players: Map<string, Player>;
  public draws: DrawStepData[];
  public subEvents: SubEventStepData[];
  public event: EventStepData;

  constructor(
    protected readonly visualTournament: XmlTournament,
    protected readonly transaction: Transaction,
    protected readonly visualService: VisualService,
    protected readonly options?: {
      fixGender?: boolean;
      updateMeta?: boolean;
    }
  ) {
    super(visualTournament, transaction);

    this.options = {
      fixGender: false,
      updateMeta: false,
      ...this.options
    };
  }

  public async process(): Promise<void> {
    const updatedGames = [];
    const updatedgamePlayers = [];
    const processSubevents = async ({ draw, internalId }: DrawStepData) => {
      const games = await draw.getGames({
        transaction: this.transaction,
        include: [Player]
      });
      const subEvent = this.subEvents.find((sub) => draw.subeventId === sub.subEvent.id).subEvent;

      const visualMatch = (
        await this.visualService.getMatches(this.visualTournament.Code, internalId)
      ).filter((m) => !m || m?.Winner !== 0) as XmlMatch[];

      for (const xmlMatch of visualMatch) {
        let game = games.find((r) => r.visualCode === `${xmlMatch.Code}`);

        const playedAt =
          xmlMatch.MatchTime != null
            ? moment(xmlMatch.MatchTime).toDate()
            : this.event.event.firstDay;
        let markedForUpdate = false;

        if (!game) {
          game = new Game({
            round: xmlMatch.RoundName,
            winner: xmlMatch.Winner,
            gameType: subEvent.gameType,
            visualCode: xmlMatch.Code,
            linkId: draw.id,
            linkType: 'tournament'
          });

          updatedgamePlayers.push(...this._createGamePlayers(xmlMatch, game, this.players));
          markedForUpdate = true;
        }

        if (this.options.updateMeta) {
          // Set dates (if changed)
          game.playedAt = playedAt;

          // Update round
          game.round = xmlMatch.RoundName;

          // Set winner
          game.winner = xmlMatch.Winner;

          // Set sets
          game.set1Team1 = xmlMatch?.Sets?.Set[0]?.Team1;
          game.set1Team2 = xmlMatch?.Sets?.Set[0]?.Team2;

          game.set2Team1 = xmlMatch?.Sets?.Set[1]?.Team1;
          game.set2Team2 = xmlMatch?.Sets?.Set[1]?.Team2;

          game.set3Team1 = xmlMatch?.Sets?.Set[2]?.Team1;
          game.set3Team2 = xmlMatch?.Sets?.Set[2]?.Team2;
          markedForUpdate = true;
        }

        if (this.options.fixGender) {
          game.gameType = subEvent.gameType;
          markedForUpdate = true;
        }

        if (markedForUpdate) {
          updatedGames.push(game.toJSON());
        }
      }

      // Remove draw that are not in the xml
      const removedGames = games.filter((g) => g.visualCode == null);
      for (const removed of removedGames) {
        await removed.destroy({ transaction: this.transaction });
      }
    };

    await Promise.all(this.draws.map((e) => processSubevents(e)));
    logger.debug(`Creating/updating ${updatedGames.length} games`);

    await Game.bulkCreate(updatedGames, {
      transaction: this.transaction,
      updateOnDuplicate: [
        'winner',
        'set1Team1',
        'set1Team2',
        'set2Team1',
        'set2Team2',
        'set3Team1',
        'set3Team2',
        'updatedAt'
      ]
    });

    await GamePlayer.bulkCreate(updatedgamePlayers, {
      transaction: this.transaction
    });
  }

  private _createGamePlayers(xmlGame: XmlMatch, game: Game, players: Map<string, Player>) {
    const gamePlayers = [];

    const t1p1 = players.get(`${xmlGame?.Team1?.Player1?.MemberID}`);
    const t1p2 = players.get(`${xmlGame?.Team1?.Player2?.MemberID}`);
    const t2p1 = players.get(`${xmlGame?.Team2?.Player1?.MemberID}`);
    const t2p2 = players.get(`${xmlGame?.Team2?.Player2?.MemberID}`);

    if (t1p1 && xmlGame?.Team1?.Player1?.MemberID != null) {
      gamePlayers.push(
        new GamePlayer({
          gameId: game.id,
          playerId: t1p1.id,
          team: 1,
          player: 1
        }).toJSON()
      );
    }

    if (t1p2 && xmlGame?.Team1?.Player2?.MemberID != null && t1p2?.id !== t1p1?.id) {
      gamePlayers.push(
        new GamePlayer({
          gameId: game.id,
          playerId: t1p2.id,
          team: 1,
          player: 2
        }).toJSON()
      );
    }

    if (t2p1 && xmlGame?.Team2?.Player1?.MemberID != null) {
      gamePlayers.push(
        new GamePlayer({
          gameId: game.id,
          playerId: t2p1.id,
          team: 2,
          player: 1
        }).toJSON()
      );
    }

    if (t2p2 && xmlGame?.Team2?.Player2?.MemberID != null && t2p2?.id !== t2p1?.id) {
      gamePlayers.push(
        new GamePlayer({
          gameId: game.id,
          playerId: t2p2.id,
          team: 2,
          player: 2
        }).toJSON()
      );
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
}
