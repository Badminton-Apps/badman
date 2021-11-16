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
import { Transaction } from 'sequelize';
import { StepProcessor } from '../../../../../../utils/step-processor';
import { VisualService } from '../../../../../../utils/visualService';
import { EncounterStepData } from './encounter';

export class CompetitionSyncGameProcessor extends StepProcessor {
  public players: Map<string, Player>;
  public encounters: EncounterStepData[];

  constructor(
    protected readonly visualTournament: XmlTournament,
    protected readonly transaction: Transaction,
    protected readonly visualService: VisualService
  ) {
    super(visualTournament, transaction);
  }

  public async process(): Promise<void> {
    const updatedGames = [];
    const updatedgamePlayers = [];
    const processEncounters = async ({ encounter, internalId }) => {
      const games = await encounter.getGames({
        transaction: this.transaction,
        include: [Player]
      });

      const visualMatch = (
        await this.visualService.getMatch(this.visualTournament.Code, internalId)
      ).filter(m => !m || m?.Winner !== 0);

      for (const xmlMatch of visualMatch) {
        let game = games.find(
          r =>
            r.round === (xmlMatch.RoundName ?? null) ||
            (null && r.visualCode === `${xmlMatch.Code}`)
        );

        if (!game) {
          game = new Game({
            visualCode: xmlMatch.Code,
            playedAt: encounter.date,
            winner: xmlMatch.Winner,
            gameType: this._getGameType(xmlMatch.MatchTypeID),
            order: xmlMatch.MatchOrder,
            linkId: encounter.id,
            linkType: 'competition'
          });

          updatedgamePlayers.push(...this._createGamePlayers(xmlMatch, game, this.players));
        }

        // Set winner
        game.winner = xmlMatch.Winner;

        // Set sets
        game.set1Team1 = xmlMatch?.Sets?.Set[0]?.Team1;
        game.set1Team2 = xmlMatch?.Sets?.Set[0]?.Team2;

        game.set2Team1 = xmlMatch?.Sets?.Set[1]?.Team1;
        game.set2Team2 = xmlMatch?.Sets?.Set[1]?.Team2;

        game.set3Team1 = xmlMatch?.Sets?.Set[2]?.Team1;
        game.set3Team2 = xmlMatch?.Sets?.Set[2]?.Team2;

        updatedGames.push(game.toJSON());
      }

      // Remove draw that are not in the xml
      const removedGames = games.filter(g => g.visualCode == null);
      for (const removed of removedGames) {
        await removed.destroy({ transaction: this.transaction });
      }
    };

    await Promise.all(this.encounters.map(e => processEncounters(e)));
    logger.debug(`Creating ${updatedGames.length} games`);

    await Game.bulkCreate(updatedGames, {
      transaction: this.transaction,
      updateOnDuplicate: [
        'winner',
        'set1Team1',
        'set1Team2',
        'set2Team1',
        'set2Team2',
        'set3Team1',
        'set3Team2'
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
