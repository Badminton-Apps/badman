import { User } from "@badman/backend-authorization";
import {
  DrawTournament,
  EncounterCompetition,
  Game,
  GameNewInput,
  GamePlayerMembership,
  GamePlayerMembershipType,
  GameUpdateInput,
  Player,
  RankingLastPlace,
  RankingPoint,
  RankingSystem,
} from "@badman/backend-database";
import { Sync, SyncQueue } from "@badman/backend-queue";
import { getRankingProtected } from "@badman/utils";
import { InjectQueue } from "@nestjs/bull";
import { Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import { Queue } from "bull";
import { Op } from "sequelize";
import { ListArgs } from "../../utils";

import { Sequelize } from "sequelize-typescript";

@Resolver(() => Game)
export class GamesResolver {
  private readonly logger = new Logger(GamesResolver.name);
  constructor(
    private _sequelize: Sequelize,
    @InjectQueue(SyncQueue) private readonly _syncQueue: Queue
  ) {}

  @Query(() => Game)
  async game(@Args("id", { type: () => ID }) id: string): Promise<Game> {
    const game = await Game.findByPk(id);

    if (!game) {
      throw new NotFoundException(id);
    }
    return game;
  }

  @Query(() => [Game])
  async games(@Args() listArgs: ListArgs): Promise<Game[]> {
    return Game.findAll({
      subQuery: false,
      include: [
        {
          model: EncounterCompetition,
          as: "competition",
        },
        {
          model: Player,
          as: "players",
        },
      ],
      ...ListArgs.toFindOptions(listArgs),
    });
  }

  @ResolveField(() => [RankingPoint])
  async rankingPoints(@Parent() game: Game, @Args() listArgs: ListArgs): Promise<RankingPoint[]> {
    return game.getRankingPoints(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => EncounterCompetition)
  async competition(@Parent() game: Game): Promise<EncounterCompetition | null> {
    if (game.linkType == "competition") {
      return game.getCompetition();
    }
    return null;
  }

  @ResolveField(() => DrawTournament)
  async tournament(@Parent() game: Game): Promise<DrawTournament | null> {
    if (game.linkType == "tournament") {
      return game.getTournament();
    }

    return null;
  }

  @ResolveField(() => [GamePlayerMembershipType])
  async players(@Parent() game: Game): Promise<(Player & GamePlayerMembership)[]> {
    const players = (await game.getPlayers()) as (Player & {
      GamePlayerMembership: GamePlayerMembership;
    })[];

    // check if any single, double or mixed is null
    const hasNull = players?.some(
      (gamePlayer: Player & { GamePlayerMembership: GamePlayerMembership }) => {
        return (
          gamePlayer.GamePlayerMembership.single == null ||
          gamePlayer.GamePlayerMembership.double == null ||
          gamePlayer.GamePlayerMembership.mix == null
        );
      }
    );

    let system: RankingSystem | null = null;
    if (hasNull) {
      system = await RankingSystem.findOne({
        where: {
          primary: true,
        },
      });
    }

    return players?.map((gamePlayer: Player & { GamePlayerMembership: GamePlayerMembership }) => {
      if (hasNull) {
        if (!system) {
          throw new NotFoundException("No primary ranking system found");
        }

        const place = getRankingProtected(gamePlayer.GamePlayerMembership, system);

        return {
          ...gamePlayer.GamePlayerMembership.toJSON(),
          ...gamePlayer.toJSON(),
          single: place.single,
          double: place.double,
          mix: place.mix,
        } as Player & GamePlayerMembership;
      }

      return {
        ...gamePlayer.GamePlayerMembership.toJSON(),
        ...gamePlayer.toJSON(),
      } as Player & GamePlayerMembership;
    });
  }

  @Mutation(() => Game)
  async createGame(@Args("data") newGameData: GameNewInput, @User() user: Player): Promise<Game> {
    const transaction = await this._sequelize.transaction();
    try {
      const encounter = await EncounterCompetition.findByPk(newGameData.linkId, {
        transaction,
      });

      if (!encounter) {
        throw new NotFoundException(`${EncounterCompetition.name}: ${newGameData.linkId}`);
      }

      if (encounter.gameLeaderId !== user.id) {
        throw new NotFoundException("You are not the game leader");
      }

      const gameData = { ...newGameData };

      const game = await Game.create(
        {
          playedAt: gameData.playedAt,
          linkId: gameData.linkId,
          linkType: gameData.linkType,
          set1Team1: gameData.set1Team1,
          set1Team2: gameData.set1Team2,
          set2Team1: gameData.set2Team1,
          set2Team2: gameData.set2Team2,
          set3Team1: gameData.set3Team1,
          set3Team2: gameData.set3Team2,
          gameType: gameData.gameType,
          winner: gameData.winner,
          order: gameData.order,
          status: gameData.status,
        },
        { transaction }
      );

      if (gameData.players) {
        for (const player of gameData.players) {
          const system = await RankingSystem.findOne({
            where: {
              primary: true,
            },
          });
          const ranking = await RankingLastPlace.findOne({
            where: {
              playerId: player.id,
            },
            transaction,
          });
          await GamePlayerMembership.create(
            {
              playerId: player.id,
              gameId: game.id,
              team: player.team,
              player: player.player,
              systemId: system?.id,
              single: ranking?.single,
              double: ranking?.double,
              mix: ranking?.mix,
            },
            {
              transaction,
            }
          );
        }
      }

      // Explicit null / undefined check because we do want to pass the check
      // when the winner is "0"
      if (gameData.winner !== undefined && gameData.winner !== null) {
        await Game.updateEncounterScore(encounter, { transaction });
      }

      // if game is not a draw, update the score of the encounter
      /*  if (gameData.winner !== 0) {
        await encounter.update(
          {
            ...(gameData.winner === 1 ? { homeScore: encounter.homeScore + 1 } : {}),
            ...(gameData.winner === 2 ? { awayScore: encounter.awayScore + 1 } : {}),
          },
          { transaction }
        );
      }
 */
      await transaction.commit();
      return game;
    } catch (e) {
      this.logger.warn("rollback", e);
      await transaction.rollback();
      throw e;
    }
  }

  @Mutation(() => Game)
  async updateGame(
    @Args("data") updateGameData: GameUpdateInput,
    @User() user: Player
  ): Promise<Game> {
    const transaction = await this._sequelize.transaction();
    try {
      const encounter = await EncounterCompetition.findByPk(updateGameData.linkId, {
        transaction,
      });

      if (!encounter) {
        throw new NotFoundException(`${EncounterCompetition.name}: ${updateGameData.linkId}`);
      }

      if (encounter.gameLeaderId !== user.id) {
        throw new NotFoundException("You are not the game leader");
      }

      const gameData = { ...updateGameData };

      const game = await Game.findByPk(gameData.gameId, {
        transaction,
        include: [
          /* This is to ensure that the frontend can update game records that originated from toernooi.nl */
          {
            model: Player,
            through: { attributes: ["team", "player", "single", "double", "mix"] },
          },
        ],
      });

      if (!game) {
        throw new NotFoundException(`${Game.name}: ${gameData.gameId}`);
      }

      const updatedGame = await game.update(
        {
          playedAt: gameData.playedAt,
          set1Team1: gameData.set1Team1,
          set1Team2: gameData.set1Team2,
          set2Team1: gameData.set2Team1,
          set2Team2: gameData.set2Team2,
          set3Team1: gameData.set3Team1,
          set3Team2: gameData.set3Team2,
          gameType: gameData.gameType,
          winner: gameData.winner,
        },
        { transaction }
      );

      // if there are players in the request, replace the existing players with the new ones
      if (gameData.players) {
        // Prepare player memberships data
        const playerMemberships = [];
        for (const player of gameData.players) {
          const ranking = await RankingLastPlace.findOne({
            where: {
              playerId: player.id,
            },
            transaction,
          });

          const membershipData = {
            playerId: player.id,
            gameId: game.id,
            team: player.team,
            player: player.player,
            systemId: player.systemId,
            single: ranking?.single,
            double: ranking?.double,
            mix: ranking?.mix,
          };
          playerMemberships.push(membershipData);
        }

        // Use bulkCreate with updateOnDuplicate to handle existing records
        await GamePlayerMembership.bulkCreate(playerMemberships, {
          transaction,
          updateOnDuplicate: ["team", "player", "systemId", "single", "double", "mix"],
        });

        // Remove any existing memberships that are not in the new list
        const newPlayerIds = gameData.players.map((p) => p.id);

        await GamePlayerMembership.destroy({
          where: {
            gameId: game.id,
            playerId: {
              [Op.notIn]: newPlayerIds,
            },
          },
          transaction,
        });
      }

      if (gameData.winner !== undefined && gameData.winner !== null) {
        await Game.updateEncounterScore(encounter, { transaction });
      }

      await transaction.commit();
      return updatedGame;
    } catch (e) {
      this.logger.warn("rollback", e);
      await transaction.rollback();
      throw e;
    }
  }

  @Mutation(() => Boolean)
  async syncGame(
    @User() user: Player,
    @Args("gameId", { type: () => ID, nullable: true }) gameId: string,

    @Args("drawId", { type: () => ID, nullable: true }) drawId: string,
    @Args("gameCode", { type: () => ID, nullable: true }) gameCode: string
  ): Promise<boolean> {
    if (!(await user.hasAnyPermission(["sync:tournament", "sync:competition"]))) {
      throw new UnauthorizedException(`You do not have permission to sync tournament`);
    }

    this._syncQueue.add(
      Sync.ScheduleSyncTournamentGame,
      {
        gameId,
        drawId,
        gameCode,
      },
      {
        removeOnComplete: true,
      }
    );

    return true;
  }
}
