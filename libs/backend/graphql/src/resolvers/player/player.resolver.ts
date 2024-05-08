import { LoggedInUser, User } from '@badman/backend-authorization';
import {
  Claim,
  Club,
  ClubPlayerMembership,
  ClubWithPlayerMembershipType,
  Game,
  GamePlayerMembership,
  GamePlayerMembershipType,
  Notification,
  PagedPlayer,
  Player,
  PlayerNewInput,
  PlayerUpdateInput,
  PlayerWithClubMembershipType,
  PlayerWithTeamMembershipType,
  PushSubscription,
  PushSubscriptionInputType,
  RankingLastPlace,
  RankingPlace,
  RankingSystem,
  Setting,
  SettingUpdateInput,
  Team,
  TeamPlayerMembership,
  TeamWithPlayerMembershipType,
} from '@badman/backend-database';
import { IsUUID, getCurrentSeason, getRankingProtected } from '@badman/utils';
import { Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { ListArgs, WhereArgs, queryFixer } from '../../utils';

@Resolver(() => Player)
export class PlayersResolver {
  protected readonly logger = new Logger(PlayersResolver.name);

  constructor(private _sequelize: Sequelize) {}

  @Query(() => Player)
  async player(@Args('id', { type: () => ID }) id: string): Promise<Player> {
    const player = IsUUID(id)
      ? await Player.findByPk(id)
      : await Player.findOne({
          where: {
            slug: id,
          },
        });

    if (player) {
      return player;
    }

    throw new NotFoundException(id);
  }

  @Query(() => Player, { nullable: true })
  async me(@User() user: Player): Promise<Player | null> {
    if (user?.id) {
      return user;
    } else {
      return null;
    }
  }

  @Query(() => PagedPlayer)
  async players(@Args() listArgs: ListArgs): Promise<{ count: number; rows: Player[] }> {
    const options = ListArgs.toFindOptions(listArgs);
    return Player.findAndCountAll(options);
  }

  @ResolveField(() => String)
  async phone(@User() user: Player, @Parent() player: Player) {
    const perm = [`details-any:player`, `${player.id}_details:player`];
    if (await user.hasAnyPermission(perm)) {
      return player.phone;
    }

    return null;
  }

  @ResolveField(() => String)
  async email(@User() user: Player, @Parent() player: Player) {
    const perm = [`details-any:player`, `${player.id}_details:player`];
    if (player.id == user.id || (await user.hasAnyPermission(perm))) {
      return player.email;
    }
    return null;
  }

  @ResolveField(() => String)
  async birthDate(@User() user: Player, @Parent() player: Player) {
    const perm = [`details-any:player`, `${player.id}_details:player`];
    if (player.id == user.id || (await user.hasAnyPermission(perm))) {
      return player.birthDate;
    }
    return null;
  }

  @ResolveField(() => [Claim])
  async claims(@Parent() player: Player, @Args() listArgs: ListArgs): Promise<Claim[]> {
    return player.getClaims(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [Notification])
  async notifications(@User() user: Player, @Args() listArgs: ListArgs): Promise<Notification[]> {
    return user.getNotifications(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [Claim])
  async permissions(@Parent() player: Player): Promise<string[]> {
    return player.getPermissions();
  }

  @ResolveField(() => [RankingPlace], { description: 'Default sorting: DESC' })
  async rankingPlaces(
    @Parent() player: Player,
    @Args() listArgs: ListArgs,
  ): Promise<RankingPlace[]> {
    const places = await player.getRankingPlaces({
      order: [['rankingDate', 'DESC']],
      ...ListArgs.toFindOptions(listArgs),
    });

    // distinct systemIds
    const systemIds = [...new Set(places.map((place) => place.systemId))];
    const systems = await RankingSystem.findAll({
      where: {
        id: systemIds,
      },
    });

    return (
      places?.map((place) => {
        const system = systems.find((sys) => sys.id === place.systemId);

        if (!system) {
          throw new NotFoundException(`${RankingSystem.name}: ${place.systemId}`);
        }

        return getRankingProtected(place, system);
      }) ?? []
    );
  }

  @ResolveField(() => [RankingLastPlace], {
    description: 'Default sorting: DESC',
  })
  async rankingLastPlaces(
    @Parent() player: Player,
    @Args() listArgs: ListArgs,
  ): Promise<RankingLastPlace[]> {
    const places = await player.getRankingLastPlaces({
      order: [['rankingDate', 'DESC']],
      ...ListArgs.toFindOptions(listArgs),
    });

    // distinct systemIds
    const systemIds = [...new Set(places.map((place) => place.systemId))];
    const systems = await RankingSystem.findAll({
      where: {
        id: systemIds,
      },
    });

    return (
      places?.map((place) => {
        const system = systems.find((sys) => sys.id === place.systemId);

        if (!system) {
          throw new NotFoundException(`${RankingSystem.name}: ${place.systemId}`);
        }

        return getRankingProtected(place, system);
      }) ?? []
    );
  }

  @ResolveField(() => [Game])
  async games(@Parent() player: Player, @Args() listArgs: ListArgs): Promise<Game[]> {
    return player.getGames(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [TeamWithPlayerMembershipType])
  async teams(
    @Parent() player: Player,
    @Args() listArgs: ListArgs,
    @Args('season', {
      nullable: true,
      description: 'Include the inactive teams (this overwrites the active filter if given)',
    })
    season?: number,
  ): Promise<(Team & { TeamMembership: TeamPlayerMembership })[] | Team[] | undefined> {
    const args = ListArgs.toFindOptions(listArgs);

    args.where = {
      season: season ?? getCurrentSeason(),
      ...args.where,
    };

    return player.getTeams(args);
  }

  @ResolveField(() => [ClubWithPlayerMembershipType], { nullable: true })
  async clubs(
    @Parent() player: Player,
    @Args() listArgs: ListArgs,
    @Args('includeHistorical', {
      nullable: true,
      description: 'Include the historical clubs',
      defaultValue: false,
      type: () => Boolean,
    })
    historical = false,
  ): Promise<(Club & { ClubMembership: ClubPlayerMembership })[] | Club[] | undefined> {
    const args = ListArgs.toFindOptions(listArgs);

    if (!historical) {
      args.where = {
        ...args.where,
        // [`$${ClubPlayerMembership.name}.active$`]: true,
      };
    }
    return player.getClubs({
      ...args,
    });
  }

  @ResolveField(() => Setting, { nullable: true })
  async setting(@Parent() player: Player): Promise<Setting> {
    return player.getSetting();
  }

  @Mutation(() => Player)
  async createPlayer(@User() user: Player, @Args('data') data: PlayerNewInput) {
    if (!(await user.hasAnyPermission(['add:player']))) {
      throw new UnauthorizedException(`You do not have permission to create a player`);
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();

    try {
      const player = await Player.create(
        {
          ...data,
        },
        { transaction },
      );

      await transaction.commit();

      return player;
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }

  @Mutation(() => Player)
  async updatePlayer(@User() user: Player, @Args('data') data: PlayerUpdateInput) {
    if (!(await user.hasAnyPermission([`${data.id}_edit:player`, 'edit-any:player']))) {
      throw new UnauthorizedException(`You do not have permission to edit this player`);
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

  @Mutation(() => Boolean)
  async removePlayer(@User() user: Player, @Args('id', { type: () => ID }) id: string) {
    if (!(await user.hasAnyPermission(['delete:player']))) {
      throw new UnauthorizedException(`You do not have permission to delete this player`);
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      const player = await Player.findByPk(id, { transaction });

      if (!player) {
        throw new NotFoundException(`${Player.name}: ${id}`);
      }

      // destroy player
      await player.destroy({ transaction });

      // Commit transaction
      await transaction.commit();

      return true;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  @Mutation(() => Player)
  async claimAccount(
    @User() user: LoggedInUser,
    @Args('playerId') playerId: string,
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
    @Args('settings') settingsInput: SettingUpdateInput,
  ): Promise<boolean> {
    if (!user) {
      throw new UnauthorizedException();
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      let setting = await user.getSetting({ transaction });

      if (!setting) {
        setting = new Setting({
          playerId: user.id,
        });
      }

      // Update club
      await setting.update(settingsInput, { transaction });

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
    @Args('subscription') subscription: PushSubscriptionInputType,
  ): Promise<boolean> {
    if (!user || !user?.id) {
      return false;
    }

    let settings = await user?.getSetting();

    if (!settings) {
      settings = new Setting({
        playerId: user.id,
      });
    }

    // check if the subscription already exists
    const existing = settings?.pushSubscriptions?.find(
      (sub) => sub.endpoint === subscription.endpoint,
    );

    if (!existing) {
      this.logger.debug(
        `Adding subscription for player ${user.fullName} (${subscription.endpoint})`,
      );
      settings.pushSubscriptions.push({
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime,
        keys: {
          p256dh: subscription.keys?.p256dh,
          auth: subscription.keys?.auth,
        },
      } as PushSubscription);
      settings.changed('pushSubscriptions', true);
      await settings.save();
    }

    return true;
  }
}

@Resolver(() => GamePlayerMembershipType)
export class GamePlayersResolver extends PlayersResolver {
  @ResolveField(() => RankingPlace)
  async rankingPlace(
    @Parent() player: Player & { GamePlayerMembership: GamePlayerMembership },
    @Args() listArgs: WhereArgs,
  ): Promise<RankingPlace> {
    const game = await Game.findByPk(player.GamePlayerMembership.gameId, {
      attributes: ['playedAt'],
    });

    if (!game) {
      throw new NotFoundException(`${Game.name}: ${player.GamePlayerMembership.gameId}`);
    }

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

@Resolver(() => PlayerWithTeamMembershipType)
export class PlayerTeamResolver extends PlayersResolver {
  protected override readonly logger = new Logger(PlayerTeamResolver.name);

  @ResolveField(() => [RankingLastPlace])
  override async rankingLastPlaces(
    @Parent() player: Player,
    @Args() listArgs: ListArgs,
  ): Promise<RankingLastPlace[]> {
    const args = ListArgs.toFindOptions(listArgs);

    args.where = {
      ...args.where,
      playerId: player.id,
    };

    const places = await RankingLastPlace.findAll(args);

    // distinct systemIds
    const systemIds = [...new Set(places.map((place) => place.systemId))];
    const systems = await RankingSystem.findAll({
      where: {
        id: systemIds,
      },
    });

    return (
      places?.map((place) => {
        const system = systems.find((sys) => sys.id === place.systemId);

        if (!system) {
          throw new NotFoundException(`${RankingSystem.name}: ${place.systemId}`);
        }

        return getRankingProtected(place, system);
      }) ?? []
    );
  }

  @ResolveField(() => [RankingPlace], {
    description: '(Default) sorting: DESC \n\r(Default) take: 1',
  })
  override async rankingPlaces(
    @Parent() player: Player,
    @Args() listArgs: ListArgs,
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

    const places = await RankingPlace.findAll(args);

    // distinct systemIds
    const systemIds = [...new Set(places.map((place) => place.systemId))];
    const systems = await RankingSystem.findAll({
      where: {
        id: systemIds,
      },
    });

    return (
      places?.map((place) => {
        const system = systems.find((sys) => sys.id === place.systemId);

        if (!system) {
          throw new NotFoundException(`${RankingSystem.name}: ${place.systemId}`);
        }

        return getRankingProtected(place, system);
      }) ?? []
    );
  }

  @ResolveField(() => TeamPlayerMembership, { nullable: true })
  async teamMembership(
    @Parent() player: Player & { TeamPlayerMembership: TeamPlayerMembership },
  ): Promise<TeamPlayerMembership> {
    return player.TeamPlayerMembership;
  }
}

@Resolver(() => PlayerWithClubMembershipType)
export class PlayerClubResolver extends PlayersResolver {
  @ResolveField(() => ClubPlayerMembership, { nullable: true })
  async clubMembership(
    @Parent() player: Player & { ClubPlayerMembership: ClubPlayerMembership },
  ): Promise<ClubPlayerMembership> {
    return player.ClubPlayerMembership;
  }
}
