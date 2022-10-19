import {
  Claim,
  Club,
  Game,
  GamePlayer,
  GamePlayerMembership,
  PagedPlayer,
  Player,
  PlayerNewInput,
  PlayerUpdateInput,
  PushSubscriptionInputType,
  PushSubscription,
  RankingLastPlace,
  RankingPlace,
  Setting,
  Team,
  TeamPlayer,
  SettingUpdateInput,
} from '@badman/backend/database';
import {
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  Args,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { Op } from 'sequelize';
import { LoggedInUser, User } from '@badman/backend/authorization';
import { ListArgs, queryFixer, WhereArgs } from '../../utils';
import { Sequelize } from 'sequelize-typescript';

@Resolver(() => Player)
export class PlayersResolver {
  private readonly logger = new Logger(PlayersResolver.name);

  constructor(private _sequelize: Sequelize) {}

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

  @ResolveField(() => [Claim])
  async permissions(@Parent() player: Player): Promise<string[]> {
    return player.getPermissions();
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

  @ResolveField(() => Setting)
  async setting(@Parent() player: Player): Promise<Setting> {
    return player.getSetting();
  }

  @Mutation(() => Player)
  async addPlayer(@User() user: Player, @Args('data') data: PlayerNewInput) {
    if (!user.hasAnyPermission(['add:player'])) {
      throw new UnauthorizedException(
        `You do not have permission to create a player`
      );
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();

    try {
      const player = await Player.create(
        {
          ...data,
        },
        { transaction }
      );

      await transaction.commit();

      return player;
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }

  @Mutation(() => Player)
  async updatePlayer(
    @User() user: Player,
    @Args('data') data: PlayerUpdateInput
  ) {
    if (!user.hasAnyPermission([`${data.id}_edit:player`, 'edit-any:player'])) {
      throw new UnauthorizedException(
        `You do not have permission to edit this player`
      );
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      const player = await Player.findByPk(data.id, { transaction });

      if (!player) {
        throw new NotFoundException(`${Player.name}: ${data.id}`);
      }

      // Update club
      const result = await player.update(data, { transaction });

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
      throw new NotFoundException(`${Player.name}: ${playerId}`);
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

  @Mutation(() => Boolean)
  async updateSetting(
    @User() user: Player,
    @Args('settings') settingsInput: SettingUpdateInput
  ): Promise<boolean> {
    if (!user) {
      throw new UnauthorizedException();
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      const setting = await user.getSetting({ transaction });

      if (!setting) {
        throw new NotFoundException(`${Setting.name}: ${user.id}`);
      }

      // Update club
      const result = await setting.update(settingsInput, { transaction });

      // Commit transaction
      await transaction.commit();

      return true;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  @Mutation(() => Boolean)
  async addPushSubScription(
    @User() user: Player,
    @Args('subscription') subscription: PushSubscriptionInputType
  ): Promise<boolean> {
    let settings = await user.getSetting();

    if (!settings) {
      settings = new Setting({
        playerId: user.id,
      });
    }

    // check if the subscription already exists
    const existing = settings?.pushSubscriptions?.find(
      (sub) => sub.endpoint === subscription.endpoint
    );

    if (!existing) {
      this.logger.debug(
        `Adding subscription for player ${user.fullName} (${subscription.endpoint})`
      );
      settings.pushSubscriptions.push({
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      } as PushSubscription);
      settings.changed('pushSubscriptions', true);
      await settings.save();
    }

    return true;
  }
}

@Resolver(() => GamePlayer)
export class GamePlayersResolver extends PlayersResolver {
  @ResolveField(() => RankingPlace)
  async rankingPlace(
    @Parent() player: Player & { GamePlayerMembership: GamePlayerMembership },
    @Args() listArgs: WhereArgs
  ): Promise<RankingPlace> {
    const game = await Game.findByPk(player.GamePlayerMembership.gameId, {
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
