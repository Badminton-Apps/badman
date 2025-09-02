import {
  EncounterCompetition,
  Game,
  GamePlayerMembership,
  Player,
  RankingSystem,
} from "@badman/backend-database";
import {
  VisualService,
  XmlMatch,
  XmlMatchTypeID,
  XmlPlayer,
  XmlScoreStatus,
  XmlTournament,
} from "@badman/backend-visual";
import { GameStatus, GameType, getRankingProtected, runParallel } from "@badman/utils";
import { Logger, NotFoundException } from "@nestjs/common";
import moment from "moment";
import { Op } from "sequelize";
import { StepOptions, StepProcessor } from "../../../../processing";
import { correctWrongPlayers } from "../../../../utils";
import { EncounterStepData } from "./encounter";
import { reverseMapWinnerValue } from "../../../../utils/mapWinnerValues";

export class CompetitionSyncGameProcessor extends StepProcessor {
  public players?: Map<string, Player>;
  public encounters?: EncounterStepData[];

  private _games: Game[] = [];
  private _system?: RankingSystem | null;

  constructor(
    protected readonly visualTournament: XmlTournament,
    protected readonly visualService: VisualService,
    options?: StepOptions
  ) {
    if (!options) {
      options = {};
    }
    options.logger = options.logger || new Logger(CompetitionSyncGameProcessor.name);
    super(options);
  }

  public async process(): Promise<Game[]> {
    this._system = await RankingSystem.findOne({
      where: {
        primary: true,
      },
      transaction: this.transaction,
    });

    if (!this._system) {
      throw new NotFoundException(`${RankingSystem.name} primary not found`);
    }

    const games = await Game.findAll({
      where: {
        linkId: {
          [Op.in]: this.encounters?.map((encounter) => encounter?.encounter.id).flat(),
        },
      },
      transaction: this.transaction,
    });

    const promisses = this.encounters?.map((e) => {
      const filtered = games.filter((g) => g.linkId === e.encounter.id);
      return this._processEncounter(e.encounter, e.internalId, filtered);
    });

    if (!promisses) {
      return [];
    }

    await runParallel(promisses);

    return this._games;
  }

  private async _processEncounter(
    encounter: EncounterCompetition,
    internalId: number,
    games: Game[]
  ) {
    // only get info for games that have been played
    const isAFutureEncounter = moment(encounter.date).isAfter(moment());
    if (isAFutureEncounter || !encounter.date) {
      return;
    }

    const isLastWeek = moment().subtract(1, "week").isBefore(encounter.date);
    const result = await this.visualService.getTeamMatch(
      this.visualTournament.Code,
      internalId,
      !isLastWeek
    );

    const visualMatch = result.filter((m) => m != null || m != undefined) as XmlMatch[];

    for (const xmlMatch of visualMatch) {
      let game = games.find(
        (r) => r.order === xmlMatch.MatchOrder && r.visualCode === `${xmlMatch.Code}`
      );

      if (!xmlMatch.Sets) {
        xmlMatch.Sets = { Set: [] };
      }

      // check if the xmlMatch?.Sets?.Set is an array
      if (!Array.isArray(xmlMatch?.Sets?.Set)) {
        xmlMatch.Sets.Set = [xmlMatch?.Sets?.Set];
      }

      let gameStatus: GameStatus;

      switch (xmlMatch.ScoreStatus) {
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
          gameStatus = GameStatus.NORMAL;
          break;
      }

      // Capture original winner state before any updates
      const originalWinner = game?.winner;

      if (!game) {
        game = new Game({
          visualCode: xmlMatch.Code,
          winner: reverseMapWinnerValue(xmlMatch.Winner),
          gameType: this._getGameType(xmlMatch.MatchTypeID),
          order: xmlMatch.MatchOrder,
          linkId: encounter.id,
          linkType: "competition",
          status: gameStatus,
          playedAt: encounter.date,
          set1Team1: xmlMatch?.Sets?.Set?.[0]?.Team1,
          set1Team2: xmlMatch?.Sets?.Set?.[0]?.Team2,
          set2Team1: xmlMatch?.Sets?.Set?.[1]?.Team1,
          set2Team2: xmlMatch?.Sets?.Set?.[1]?.Team2,
          set3Team1: xmlMatch?.Sets?.Set?.[2]?.Team1,
          set3Team2: xmlMatch?.Sets?.Set?.[2]?.Team2,
        });
      } else {
        if (game.playedAt == null && encounter.date != null) {
          game.playedAt = encounter.date;
        }

        if (game.order == null && xmlMatch.MatchOrder != null) {
          game.order = xmlMatch.MatchOrder;
        }

        if (game.round == null && xmlMatch.RoundName != null) {
          game.round = xmlMatch.RoundName;
        }

        if (game.winner != reverseMapWinnerValue(xmlMatch.Winner)) {
          // Only update winner if toernooi.nl has data OR if we have no existing data
          if (xmlMatch.Winner != null || game.winner == null) {
            game.winner = reverseMapWinnerValue(xmlMatch.Winner);
          }
        }

        // Only update set scores if toernooi.nl has data or if our system has no data
        // This prevents overwriting existing scores with empty data from toernooi.nl
        if (game.set1Team1 != xmlMatch?.Sets?.Set?.[0]?.Team1) {
          // Only update if toernooi.nl has data OR if we have no existing data
          if (xmlMatch?.Sets?.Set?.[0]?.Team1 != null || game.set1Team1 == null) {
            game.set1Team1 = xmlMatch?.Sets?.Set?.[0]?.Team1;
          }
        }

        if (game.set1Team2 != xmlMatch?.Sets?.Set?.[0]?.Team2) {
          if (xmlMatch?.Sets?.Set?.[0]?.Team2 != null || game.set1Team2 == null) {
            game.set1Team2 = xmlMatch?.Sets?.Set?.[0]?.Team2;
          }
        }

        if (game.set2Team1 != xmlMatch?.Sets?.Set?.[1]?.Team1) {
          if (xmlMatch?.Sets?.Set?.[1]?.Team1 != null || game.set2Team1 == null) {
            game.set2Team1 = xmlMatch?.Sets?.Set?.[1]?.Team1;
          }
        }

        if (game.set2Team2 != xmlMatch?.Sets?.Set?.[1]?.Team2) {
          if (xmlMatch?.Sets?.Set?.[1]?.Team2 != null || game.set2Team2 == null) {
            game.set2Team2 = xmlMatch?.Sets?.Set?.[1]?.Team2;
          }
        }

        if (game.set3Team1 != xmlMatch?.Sets?.Set?.[2]?.Team1) {
          if (xmlMatch?.Sets?.Set?.[2]?.Team1 != null || game.set3Team1 == null) {
            game.set3Team1 = xmlMatch?.Sets?.Set?.[2]?.Team1;
          }
        }

        if (game.set3Team2 != xmlMatch?.Sets?.Set?.[2]?.Team2) {
          if (xmlMatch?.Sets?.Set?.[2]?.Team2 != null || game.set3Team2 == null) {
            game.set3Team2 = xmlMatch?.Sets?.Set?.[2]?.Team2;
          }
        }

        if (game.status !== gameStatus) {
          game.status = gameStatus;
        }
      }

      if (game.changed()) {
        await game.save({ transaction: this.transaction });
      }

      try {
        const memberships = await this._createGamePlayers(xmlMatch, game);

        // Only update player memberships if game didn't have a winner BEFORE this sync
        // If original game had no winner (null/0), create/update memberships
        // If original game already had a winner, skip (memberships already exist)
        if (originalWinner == null || originalWinner === 0) {
          // First destroy any existing memberships to prevent duplicates
          await GamePlayerMembership.destroy({
            where: { gameId: game.id },
            transaction: this.transaction,
          });

          // Then create new memberships
          await GamePlayerMembership.bulkCreate(memberships, {
            transaction: this.transaction,
            updateOnDuplicate: ["single", "double", "mix"],
          });
        } else {
          this.logger.debug(
            `Skipping player membership update for game ${game.id} - game already had winner: ${originalWinner}`
          );
        }
      } catch (e) {
        this.logger.error(
          `Error on bulk create game player membership: ${e.message}, for game: ${game.id} and ${xmlMatch.Code}`
        );
        throw e;
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

  private async _createGamePlayers(xmlMatch: XmlMatch, game: Game) {
    const gamePlayers = [];
    game.players = [];

    const team1player1 = this._getPlayer(xmlMatch?.Team1?.Player1);
    const team1player2 = this._getPlayer(xmlMatch?.Team1?.Player2);
    const team2player1 = this._getPlayer(xmlMatch?.Team2?.Player1);
    const team2player2 = this._getPlayer(xmlMatch?.Team2?.Player2);

    if (!this._system) {
      throw new Error("No ranking system");
    }

    if (team1player1) {
      const rankingt1p1 = await team1player1.getRankingPlaces({
        where: {
          systemId: this._system?.id,
          rankingDate: {
            [Op.lte]: game.playedAt,
          },
        },
        order: [["rankingDate", "DESC"]],
        limit: 1,
        transaction: this.transaction,
      });

      const place = getRankingProtected(rankingt1p1?.[0], this._system);

      const gp = new GamePlayerMembership({
        gameId: game.id,
        playerId: team1player1.id,
        team: 1,
        player: 1,
        single: place.single,
        double: place.double,
        mix: place.mix,
        systemId: this._system?.id,
      });
      gamePlayers.push(gp.toJSON());

      // Push to list
      game.players.push({
        ...team1player1.toJSON(),
        GamePlayerMembership: gp,
      } as Player & { GamePlayerMembership: GamePlayerMembership });
    }

    if (team1player2 && team1player2?.id !== team1player1?.id) {
      const rankingt1p2 = await team1player2.getRankingPlaces({
        where: {
          systemId: this._system?.id,
          rankingDate: {
            [Op.lte]: game.playedAt,
          },
        },
        order: [["rankingDate", "DESC"]],
        limit: 1,
        transaction: this.transaction,
      });

      const place = getRankingProtected(rankingt1p2?.[0], this._system);

      const gp = new GamePlayerMembership({
        gameId: game.id,
        playerId: team1player2.id,
        team: 1,
        player: 2,
        single: place.single,
        double: place.double,
        mix: place.mix,
        systemId: this._system?.id,
      });
      gamePlayers.push(gp.toJSON());
      // Push to list
      game.players.push({
        ...team1player2.toJSON(),
        GamePlayerMembership: gp,
      } as Player & { GamePlayerMembership: GamePlayerMembership });
    }

    if (team2player1) {
      const rankingt2p1 = await team2player1.getRankingPlaces({
        where: {
          systemId: this._system?.id,
          rankingDate: {
            [Op.lte]: game.playedAt,
          },
        },
        order: [["rankingDate", "DESC"]],
        limit: 1,
        transaction: this.transaction,
      });

      const place = getRankingProtected(rankingt2p1?.[0], this._system);

      const gp = new GamePlayerMembership({
        gameId: game.id,
        playerId: team2player1.id,
        team: 2,
        player: 1,
        single: place.single,
        double: place.double,
        mix: place.mix,
        systemId: this._system?.id,
      });
      gamePlayers.push(gp.toJSON());
      // Push to list
      game.players.push({
        ...team2player1.toJSON(),
        GamePlayerMembership: gp,
      } as Player & { GamePlayerMembership: GamePlayerMembership });
    }

    if (team2player2 && team2player2?.id !== team2player1?.id) {
      const rankingtt2p2 = await team2player2.getRankingPlaces({
        where: {
          systemId: this._system?.id,
          rankingDate: {
            [Op.lte]: game.playedAt,
          },
        },
        order: [["rankingDate", "DESC"]],
        limit: 1,
        transaction: this.transaction,
      });

      const place = getRankingProtected(rankingtt2p2?.[0], this._system);

      const gp = new GamePlayerMembership({
        gameId: game.id,
        playerId: team2player2.id,
        team: 2,
        player: 2,
        single: place.single,
        double: place.double,
        mix: place.mix,
        systemId: this._system?.id,
      });
      gamePlayers.push(gp.toJSON());
      // Push to list
      game.players.push({
        ...team2player2.toJSON(),
        GamePlayerMembership: gp,
      } as Player & { GamePlayerMembership: GamePlayerMembership });
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

  private _getPlayer(player?: XmlPlayer): Player | undefined {
    if (!player) {
      return undefined;
    }

    let returnPlayer = this.players?.get(`${player?.MemberID}`);

    if ((returnPlayer ?? null) == null && (player ?? null) != null) {
      // Search our map for unkowns
      const corrected = correctWrongPlayers({
        firstName: player?.Firstname,
        lastName: player?.Lastname,
      });

      returnPlayer = [...(this.players?.values() ?? [])].find(
        (p) =>
          (p.firstName === corrected.firstName && p.lastName === corrected.lastName) ||
          (p.firstName === corrected.lastName && p.lastName === corrected.firstName)
      );
    }
    return returnPlayer;
  }
}
