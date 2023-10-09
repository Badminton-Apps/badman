import {
  DrawTournament,
  EventTournament,
  Game,
  GamePlayerMembership,
  Player,
  RankingSystem,
} from '@badman/backend-database';
import {
  VisualService,
  XmlMatch,
  XmlPlayer,
  XmlScoreStatus,
  XmlTournament,
} from '@badman/backend-visual';
import { GameStatus, runParallel } from '@badman/utils';
import { Logger, NotFoundException } from '@nestjs/common';
import moment from 'moment-timezone';
import { Op } from 'sequelize';
import { StepOptions, StepProcessor } from '../../../../processing';
import { correctWrongPlayers } from '../../../../utils';
import { DrawStepData } from './draw';
import { EventStepData } from './event';
import { SubEventStepData } from './subEvent';

export interface GameStepOptions {
  newGames?: boolean;
}

export class TournamentSyncGameProcessor extends StepProcessor {
  public players?: Map<string, Player>;
  public draws?: DrawStepData[];
  public subEvents?: SubEventStepData[];
  public event?: EventStepData;
  private _games: Game[] = [];
  private _system?: RankingSystem | null;

  private gameOptions: GameStepOptions;

  constructor(
    protected readonly visualTournament: XmlTournament,
    protected readonly visualService: VisualService,
    options?: StepOptions & GameStepOptions
  ) {
    if (!options) {
      options = {};
    }

    options.logger =
      options.logger || new Logger(TournamentSyncGameProcessor.name);
    super(options);

    this.gameOptions = options || {};
  }

  public async process(): Promise<Game[]> {
    this._system = await RankingSystem.findOne({
      where: {
        primary: true,
      },
      transaction: this.transaction,
    });

    await runParallel(
      this.draws?.map((e) => this._processSubevent(e.draw, e.internalId)) ?? []
    );

    return this._games;
  }

  private async _processSubevent(draw: DrawTournament, internalId: number) {
    if (!this.event?.event) {
      throw new NotFoundException(`${EventTournament.name} not found`);
    }

    const games = await draw.getGames({
      transaction: this.transaction,
      // include: [Player]
    });
    const subEvent = this.subEvents?.find(
      (sub) => draw.subeventId === sub.subEvent.id
    )?.subEvent;

    const isLastWeek = moment()
      .subtract(2, 'week')
      .isBefore(this.event.event.firstDay);

    const visualMatch = (await this.visualService.getMatches(
      this.visualTournament.Code,
      internalId,
      !isLastWeek
    )) as XmlMatch[];

    for (const xmlMatch of visualMatch) {
      let game = games.find((r) => r.visualCode === `${xmlMatch.Code}`);

      const playedAt =
        xmlMatch.MatchTime != null
          ? moment.tz(xmlMatch.MatchTime, 'Europe/Brussels').toDate()
          : this.event.event.firstDay;

      // Check if encounter was before last run, skip if only process new events
      if (
        this.gameOptions.newGames &&
        playedAt &&
        this.lastRun &&
        playedAt < this.lastRun
      ) {
        continue;
      }

      if (!xmlMatch.Sets) {
        xmlMatch.Sets = { Set: [] };
      }

      // check if the xmlMatch?.Sets?.Set is an array
      if (!Array.isArray(xmlMatch?.Sets?.Set)) {
        xmlMatch.Sets.Set = [xmlMatch.Sets.Set];
      }

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
            !(
              xmlMatch?.Team1?.Player1?.MemberID == null &&
              xmlMatch?.Team2?.Player1?.MemberID == null
            ) &&
            // And not both players null
            (xmlMatch?.Team2?.Player1?.MemberID !== null ||
              xmlMatch?.Team2?.Player1?.MemberID !== null)
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
      }

      if (game.changed()) {
        await game.save({ transaction: this.transaction });
      }
      
      const memberships = await this._createGamePlayers(xmlMatch, game);
      await GamePlayerMembership.bulkCreate(memberships, {
        transaction: this.transaction,
        updateOnDuplicate: ['single', 'double', 'mix'],
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

  private async _createGamePlayers(xmlMatch: XmlMatch, game: Game) {
    const gamePlayers = [];
    game.players = [];

    const t1p1 = this._getPlayer(xmlMatch?.Team1?.Player1);
    const t1p2 = this._getPlayer(xmlMatch?.Team1?.Player2);
    const t2p1 = this._getPlayer(xmlMatch?.Team2?.Player1);
    const t2p2 = this._getPlayer(xmlMatch?.Team2?.Player2);

    if (!this._system) {
      throw new Error('No ranking system');
    }

    if (t1p1) {
      const rankingt1p1 = await t1p1.getRankingPlaces({
        where: {
          systemId: this._system.id,
          rankingDate: {
            [Op.lte]: game.playedAt,
          },
        },
        order: [['rankingDate', 'DESC']],
        limit: 1,
        transaction: this.transaction,
      });

      const gp = new GamePlayerMembership({
        gameId: game.id,
        playerId: t1p1.id,
        team: 1,
        player: 1,
        single: rankingt1p1.length > 0 ? rankingt1p1[0].single : undefined,
        double: rankingt1p1.length > 0 ? rankingt1p1[0].double : undefined,
        mix: rankingt1p1.length > 0 ? rankingt1p1[0].mix : undefined,
        systemId: this._system.id,
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
          systemId: this._system.id,
          rankingDate: {
            [Op.lte]: game.playedAt,
          },
        },
        order: [['rankingDate', 'DESC']],
        limit: 1,
        transaction: this.transaction,
      });

      const gp = new GamePlayerMembership({
        gameId: game.id,
        playerId: t1p2.id,
        team: 1,
        player: 2,
        single: rankingt1p2.length > 0 ? rankingt1p2[0].single : undefined,
        double: rankingt1p2.length > 0 ? rankingt1p2[0].double : undefined,
        mix: rankingt1p2.length > 0 ? rankingt1p2[0].mix : undefined,
        systemId: this._system.id,
      });
      gamePlayers.push(gp.toJSON());
      // Push to list
      game.players.push({
        ...t1p2.toJSON(),
        GamePlayerMembership: gp,
      } as Player & { GamePlayerMembership: GamePlayerMembership });
    }

    if (t2p1) {
      const rankingtt2p1 = await t2p1.getRankingPlaces({
        where: {
          systemId: this._system.id,
          rankingDate: {
            [Op.lte]: game.playedAt,
          },
        },
        order: [['rankingDate', 'DESC']],
        limit: 1,
        transaction: this.transaction, 
      });

      const gp = new GamePlayerMembership({
        gameId: game.id,
        playerId: t2p1.id,
        team: 2,
        player: 1,
        single: rankingtt2p1.length > 0 ? rankingtt2p1[0].single : undefined,
        double: rankingtt2p1.length > 0 ? rankingtt2p1[0].double : undefined,
        mix: rankingtt2p1.length > 0 ? rankingtt2p1[0].mix : undefined,
        systemId: this._system.id,
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
          systemId: this._system.id,
          rankingDate: {
            [Op.lte]: game.playedAt,
          },
        },
        order: [['rankingDate', 'DESC']],
        limit: 1,
        transaction: this.transaction,
      });
 
      const gp = new GamePlayerMembership({
        gameId: game.id,
        playerId: t2p2.id,
        team: 2,
        player: 2,
        single: rankingtt2p2.length > 0 ? rankingtt2p2[0].single : undefined,
        double: rankingtt2p2.length > 0 ? rankingtt2p2[0].double : undefined,
        mix: rankingtt2p2.length > 0 ? rankingtt2p2[0].mix : undefined,
        systemId: this._system.id,
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

  private _getPlayer(player?: XmlPlayer) {
    let key = player?.MemberID;
    if (!key) {
      key = `${player?.Firstname} ${player?.Lastname}`;
    }

    if (!key) {
      return null;
    }

    let returnPlayer = this.players?.get(key);

    if ((returnPlayer ?? null) == null && (player ?? null) != null) {
      // Search our map for unkowns
      const corrected = correctWrongPlayers({
        firstName: player?.Firstname,
        lastName: player?.Lastname,
      });

      returnPlayer = [...(this.players?.values() ?? [])].find(
        (p) =>
          (p.firstName === corrected.firstName &&
            p.lastName === corrected.lastName) ||
          (p.firstName === corrected.lastName &&
            p.lastName === corrected.firstName)
      );
    }
    return returnPlayer;
  }
}
