import {
  Claim,
  Club,
  Game,
  GamePlayer,
  GamePlayers,
  RankingLastPlace,
  Player,
  RankingPlace,
  Team,
  TeamPlayer,
  PagedPlayer,
  ClubPlayer,
  ClubPlayerMembership,
  PlayerUpdateInput,
} from '@badman/api/database';
import {
  Inject,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  Args,
  Field,
  ID,
  Mutation,
  ObjectType,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { Op, Sequelize } from 'sequelize';
import { LoggedInUser, User } from '../../decorators';
import { ListArgs, queryFixer, WhereArgs } from '../../utils';

@Resolver(() => Player)
export class PlayersResolver {
  private readonly logger = new Logger(PlayersResolver.name);

  constructor(@Inject('SEQUELIZE') private _sequelize: Sequelize) {}

  @Query(() => Player)
  async player(@Args('id', { type: () => ID }) id: string): Promise<Player> {
    let player = await Player.findByPk(id);

    if (!player) {
      player = await Player.findOne({
        where: {
          slug: id,
        },
      });
    }

    if (!player) {
      throw new NotFoundException(id);
    }
    return player;
  }

  @Query(() => Player, { nullable: true })
  async me(@User() user: Player): Promise<Player> {
    if (user?.id) {
      return user;
    } else {
      return null;
    }
  }

  @Query(() => PagedPlayer)
  async players(
    @Args() listArgs: ListArgs
  ): Promise<{ count: number; rows: Player[] }> {
    return Player.findAndCountAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => String)
  async phone(@User() user: Player, @Parent() player: Player) {
    const perm = [`details-any:player`, `${player.id}_details:player`];
    if (user.hasAnyPermission(perm)) {
      return player.phone;
    } else {
      throw new UnauthorizedException();
    }
  }

  @ResolveField(() => String)
  async email(@User() user: Player, @Parent() player: Player) {
    const perm = [`details-any:player`, `${player.id}_details:player`];
    if (user.hasAnyPermission(perm)) {
      return player.email;
    } else {
      throw new UnauthorizedException();
    }
  }

  @ResolveField(() => String)
  async birthDate(@User() user: Player, @Parent() player: Player) {
    const perm = [`details-any:player`, `${player.id}_details:player`];
    if (user.hasAnyPermission(perm)) {
      return player.birthDate;
    } else {
      throw new UnauthorizedException();
    }
  }

  @ResolveField(() => [Claim])
  async claims(
    @Parent() player: Player,
    @Args() listArgs: ListArgs
  ): Promise<Claim[]> {
    return player.getClaims(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [RankingPlace], { description: 'Default sorting: DESC' })
  async rankingPlaces(
    @Parent() player: Player,
    @Args() listArgs: ListArgs
  ): Promise<RankingPlace[]> {
    return player.getRankingPlaces({
      order: [['rankingDate', 'DESC']],
      ...ListArgs.toFindOptions(listArgs),
    });
  }
  @ResolveField(() => [RankingLastPlace], {
    description: 'Default sorting: DESC',
  })
  async rankingLastPlaces(
    @Parent() player: Player,
    @Args() listArgs: ListArgs
  ): Promise<RankingLastPlace[]> {
    return player.getRankingLastPlaces({
      order: [['rankingDate', 'DESC']],
      ...ListArgs.toFindOptions(listArgs),
    });
  }

  @ResolveField(() => [Game])
  async games(
    @Parent() player: Player,
    @Args() listArgs: ListArgs
  ): Promise<Game[]> {
    return player.getGames(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [Team])
  async teams(
    @Parent() player: Player,
    @Args() listArgs: ListArgs,
    @Args('includeDisabled', {
      nullable: true,
      description:
        'Include the inactive teams (this overwrites the active filter if given)',
    })
    disabled?: boolean
  ): Promise<Team[]> {
    const args = ListArgs.toFindOptions(listArgs);

    args.where = {
      ...args.where,
      active: disabled === undefined ? true : args.where ?? undefined,
    };

    return player.getTeams(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [Club])
  async clubs(
    @Parent() player: Player,
    @Args() listArgs: ListArgs
  ): Promise<Club[]> {
    return player.getClubs(ListArgs.toFindOptions(listArgs));
  }

  // @Mutation(returns => Player)
  // async addPlayer(
  //   @Args('newPlayerData') newPlayerData: NewPlayerInput,
  // ): Promise<Player> {
  //   const recipe = await this.recipesService.create(newPlayerData);
  //   return recipe;
  // }

  // @Mutation(returns => Boolean)
  // async removePlayer(@Args('id') id: string) {
  //   return this.recipesService.remove(id);
  // }

  @Mutation(() => Player)
  async updatePlayer(
    @User() user: Player,
    @Args('data') data: PlayerUpdateInput
  ) {
    if (!user.hasAnyPermission([`${data.id}_edit:player`, 'edit-any:player'])) {
      throw new UnauthorizedException(
        `You do not have permission to edit this club`
      );
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      let club = await Player.findByPk(data.id, { transaction });

      if (!club) {
        throw new NotFoundException(data.id);
      }

      // Update club
      const result = await club.update(data, { transaction });

      // Commit transaction
      await transaction.commit();

      return result;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  @Mutation(() => Player)
  async claimAccount(
    @User() user: LoggedInUser,
    @Args('playerId') playerId: string
  ): Promise<Player> {
    const player = await Player.findByPk(playerId);
    if (!player) {
      throw new NotFoundException(playerId);
    }

    if (player.sub === user.sub) {
      throw new Error('You are already claimed ');
    }

    if (player.sub !== null) {
      throw new Error('Player is already claimed by someone else');
    }

    player.sub = user.sub;
    await player.save();

    return player;
  }
}

@Resolver(() => GamePlayers)
export class GamePlayersResolver extends PlayersResolver {
  @ResolveField(() => RankingPlace)
  async rankingPlace(
    @Parent() player: Player & { GamePlayer: GamePlayer },
    @Args() listArgs: WhereArgs
  ): Promise<RankingPlace> {
    const game = await Game.findByPk(player.GamePlayer.gameId, {
      attributes: ['playedAt'],
    });

    const places = await RankingPlace.findAll({
      where: {
        ...queryFixer(listArgs.where),
        playerId: player.id,
        rankingDate: { [Op.lte]: game.playedAt },
      },
      order: [['rankingDate', 'DESC']],
      limit: 1,
    });

    return places[0];
  }
}

@Resolver(() => TeamPlayer)
export class TeamPlayerResolver extends PlayersResolver {
  @ResolveField(() => [RankingLastPlace])
  async rankingLastPlaces(
    @Parent() player: Player,
    @Args() listArgs: ListArgs
  ): Promise<RankingLastPlace[]> {
    const args = ListArgs.toFindOptions(listArgs);

    args.where = {
      ...args.where,
      playerId: player.id,
    };

    return await RankingLastPlace.findAll(args);
  }

  @ResolveField(() => [RankingPlace], {
    description: '(Default) sorting: DESC \n\r(Default) take: 1',
  })
  async rankingPlaces(
    @Parent() player: Player,
    @Args() listArgs: ListArgs
  ): Promise<RankingPlace[]> {
    const args = ListArgs.toFindOptions({
      order: [{ direction: 'DESC', field: 'rankingDate' }],
      take: 1,
      ...listArgs,
    });

    args.where = {
      ...args.where,
      playerId: player.id,
    };

    return await RankingPlace.findAll(args);
  }
}
