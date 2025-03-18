import {
  DrawTournament,
  EncounterCompetition,
  Game,
  GamePlayerMembershipType,
  GamePlayerMembership,
  Player,
  RankingPoint,
  RankingSystem,
  GameNewInput,
  GameUpdateInput,
  RankingLastPlace,
} from '@badman/backend-database';
import { Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ListArgs } from '../../utils';
import { getRankingProtected } from '@badman/utils';
import { User } from '@badman/backend-authorization';
import { InjectQueue } from '@nestjs/bull';
import { Sync, SyncQueue } from '@badman/backend-queue';
import { Queue } from 'bull';
import { Sequelize } from 'sequelize-typescript';

@Resolver(() => Game)
export class GamesResolver {
  private readonly logger = new Logger(GamesResolver.name);
  constructor(
    @InjectQueue(SyncQueue) private readonly _syncQueue: Queue,
    private _sequelize: Sequelize,
  ) {}
  @Query(() => Game)
  async game(@Args('id', { type: () => ID }) id: string): Promise<Game> {
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
          as: 'competition',
        },
        {
          model: Player,
          as: 'players',
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
    if (game.linkType == 'competition') {
      return game.getCompetition();
    }
    return null;
  }

  @ResolveField(() => DrawTournament)
  async tournament(@Parent() game: Game): Promise<DrawTournament | null> {
    if (game.linkType == 'tournament') {
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
      },
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
          throw new NotFoundException('No primary ranking system found');
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

  @Mutation(() => Boolean)
  async syncGame(
    @User() user: Player,
    @Args('gameId', { type: () => ID, nullable: true }) gameId: string,

    @Args('drawId', { type: () => ID, nullable: true }) drawId: string,
    @Args('gameCode', { type: () => ID, nullable: true }) gameCode: string,
  ): Promise<boolean> {
    if (!(await user.hasAnyPermission(['sync:tournament', 'sync:competition']))) {
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
      },
    );

    return true;
  }

  @Mutation(() => Game)
  async createGame(@Args('data') newGameData: GameNewInput, @User() user: Player): Promise<Game> {
    const transaction = await this._sequelize.transaction();
    try {
      const encounter = await EncounterCompetition.findByPk(newGameData.linkId, {
        transaction,
      });

      if (!encounter) {
        throw new NotFoundException(`${EncounterCompetition.name}: ${newGameData.linkId}`);
      }

      if (encounter.gameLeaderId !== user.id) {
        throw new NotFoundException('You are not the game leader');
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
        { transaction },
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
            },
          );
        }
      }

      // if game is not a draw, update the score of the encounter
      if (gameData.winner !== 0) {
        await encounter.update(
          {
            ...(gameData.winner === 1 ? { homeScore: encounter.homeScore + 1 } : {}),
            ...(gameData.winner === 2 ? { awayScore: encounter.awayScore + 1 } : {}),
          },
          { transaction },
        );
      }

      await transaction.commit();
      return game;
    } catch (e) {
      this.logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }

  @Mutation(() => Game)
  async updateGame(
    @Args('data') updateGameData: GameUpdateInput,
    @User() user: Player,
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
        throw new NotFoundException('You are not the game leader');
      }

      const gameData = { ...updateGameData };

      const game = await Game.findByPk(gameData.gameId, {
        transaction,
      });

      if (!game) {
        throw new NotFoundException(`${Game.name}: ${gameData.gameId}`);
      }

      // used to check the current winner of the game against the update data, to see if the score of the new loser needs to drop
      const oldGameWinner = game.winner;

      const updatedGame = await game.update(
        {
          set1Team1: gameData.set1Team1,
          set1Team2: gameData.set1Team2,
          set2Team1: gameData.set2Team1,
          set2Team2: gameData.set2Team2,
          set3Team1: gameData.set3Team1,
          set3Team2: gameData.set3Team2,
          gameType: gameData.gameType,
          winner: gameData.winner,
        },
        { transaction },
      );

      // if game is not a draw, update the score of the encounter
      if (gameData.winner !== 0 && oldGameWinner !== gameData.winner) {
        // updates the score of the encounter, and if the winner changes for whatever reason, the score is corrected on both sides
        await encounter.update(
          {
            ...(gameData.winner === 1
              ? {
                  homeScore: encounter.homeScore + 1,
                  ...(oldGameWinner === 2 ? { awayScore: encounter.awayScore - 1 } : {}),
                }
              : {}),
            ...(gameData.winner === 2
              ? {
                  awayScore: encounter.awayScore + 1,
                  ...(oldGameWinner === 1 ? { homeScore: encounter.homeScore - 1 } : {}),
                }
              : {}),
          },
          { transaction },
        );
      }

      await transaction.commit();
      return updatedGame;
    } catch (e) {
      this.logger.warn('rollback', e);
      await transaction.rollback();
      throw e;
    }
  }
}
