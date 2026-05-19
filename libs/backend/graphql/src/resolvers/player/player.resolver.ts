import { LoggedInUser, User } from "@badman/backend-authorization";
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
  Role,
} from "@badman/backend-database";
import { IsUUID, getSeason, getRankingProtected } from "@badman/utils";
import { Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import { Op } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import { ListArgs, WhereArgs, queryFixer } from "../../utils";
import { PointsService, RankingSystemService } from "@badman/backend-ranking";
import { PlayerAssociationService } from "./player-association.service";

const PLAYERS_DEFAULT_TAKE = 25;
const PLAYERS_MAX_TAKE = 200;

@Resolver(() => Player)
export class PlayersResolver {
  protected readonly logger = new Logger(PlayersResolver.name);

  constructor(
    private _sequelize: Sequelize,
    private pointService: PointsService,
    protected readonly rankingSystemService: RankingSystemService,
    protected readonly playerAssociations: PlayerAssociationService
  ) {}

  protected async loadSystemsByIds(
    ids: (string | null | undefined)[]
  ): Promise<(id: string | null | undefined) => RankingSystem | undefined> {
    const uniqueIds = [...new Set(ids.filter((id): id is string => !!id))];
    const systems = await Promise.all(uniqueIds.map((id) => this.rankingSystemService.getById(id)));
    const map = new Map<string, RankingSystem>();
    uniqueIds.forEach((id, idx) => {
      const sys = systems[idx];
      if (sys) {
        map.set(id, sys);
      }
    });
    return (id) => (id ? map.get(id) : undefined);
  }

  private getPlayerFilters() {
    return {
      [Op.and]: [
        { memberId: { [Op.not]: null } },
        { memberId: { [Op.not]: "" } },
        { memberId: { [Op.notILike]: "%unknown%" } },
      ],
    };
  }

  @Query(() => Player)
  async player(@Args("id", { type: () => ID }) id: string): Promise<Player> {
    const filters = this.getPlayerFilters();

    const player = IsUUID(id)
      ? await Player.findOne({
          where: {
            [Op.and]: [{ id }, filters],
          },
        })
      : await Player.findOne({
          where: {
            [Op.and]: [{ slug: id }, filters],
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
    options.limit = Math.min(options.limit ?? PLAYERS_DEFAULT_TAKE, PLAYERS_MAX_TAKE);

    const filters = this.getPlayerFilters();

    if (options.where) {
      options.where = { [Op.and]: [options.where, filters] };
    } else {
      options.where = filters;
    }

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

  @ResolveField(() => [Role])
  async roles(@Parent() player: Player, @Args() listArgs: ListArgs): Promise<Role[]> {
    return player.getRoles(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [Notification])
  async notifications(@User() user: Player, @Args() listArgs: ListArgs): Promise<Notification[]> {
    return user.getNotifications(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [Claim])
  async permissions(@Parent() player: Player): Promise<string[]> {
    return player.getPermissions();
  }

  @ResolveField(() => [RankingPlace], { description: "Default sorting: DESC" })
  async rankingPlaces(
    @Parent() player: Player,
    @Args() listArgs: ListArgs
  ): Promise<RankingPlace[]> {
    const places = await player.getRankingPlaces({
      order: [["rankingDate", "DESC"]],
      ...ListArgs.toFindOptions(listArgs),
    });

    const findSystem = await this.loadSystemsByIds(places.map((place) => place.systemId));

    return (
      places?.map((place) => {
        const system = findSystem(place.systemId);

        if (!system) {
          throw new NotFoundException(`${RankingSystem.name}: ${place.systemId}`);
        }

        return getRankingProtected(place, system);
      }) ?? []
    );
  }

  @ResolveField(() => [RankingLastPlace], {
    description: "Default sorting: DESC",
  })
  async rankingLastPlaces(
    @Parent() player: Player,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Args() listArgs: ListArgs
  ): Promise<RankingLastPlace[]> {
    const places = await this.playerAssociations.getPrimaryRankingLastPlaces(player);

    const findSystem = await this.loadSystemsByIds(places.map((place) => place.systemId));

    return (
      places?.map((place) => {
        const system = findSystem(place.systemId);

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
    @Args("season", {
      nullable: true,
      description: "Include the inactive teams (this overwrites the active filter if given)",
    })
    season?: number
  ): Promise<(Team & { TeamMembership: TeamPlayerMembership })[] | Team[] | undefined> {
    const args = ListArgs.toFindOptions(listArgs);

    args.where = {
      season: season ?? getSeason(),
      ...args.where,
    };

    return player.getTeams(args);
  }

  @ResolveField(() => [ClubWithPlayerMembershipType], { nullable: true })
  async clubs(
    @Parent() player: Player,
    @Args() listArgs: ListArgs,
    @Args("includeHistorical", {
      nullable: true,
      description: "Include the historical clubs",
      defaultValue: false,
      type: () => Boolean,
    })
    historical = false
  ): Promise<(Club & { ClubMembership: ClubPlayerMembership })[] | Club[] | undefined> {
    const args = ListArgs.toFindOptions(listArgs);
    if (!historical) {
      const now = new Date();
      args.where = {
        ...args.where,
        [`$${ClubPlayerMembership.name}.confirmed$`]: true,
        [`$${ClubPlayerMembership.name}.start$`]: {
          [Op.lt]: now,
        },
        [Op.or]: [
          {
            [`$${ClubPlayerMembership.name}.end$`]: {
              [Op.gt]: now,
            },
          },
          {
            [`$${ClubPlayerMembership.name}.end$`]: {
              [Op.is]: null,
            },
          },
        ],
      };
    }
    return await player.getClubs({
      ...args,
    });
  }

  @ResolveField(() => Setting, { nullable: true })
  async setting(@Parent() player: Player): Promise<Setting> {
    return player.getSetting();
  }

  @Mutation(() => Player)
  async createPlayer(@User() user: Player, @Args("data") data: PlayerNewInput) {
    if (!(await user.hasAnyPermission(["add:player"]))) {
      throw new UnauthorizedException(`You do not have permission to create a player`);
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
  async updatePlayer(@User() user: Player, @Args("data") data: PlayerUpdateInput) {
    if (!(await user.hasAnyPermission([`${data.id}_edit:player`, "edit-any:player"]))) {
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
  async removePlayer(@User() user: Player, @Args("id", { type: () => ID }) id: string) {
    if (!(await user.hasAnyPermission(["delete:player"]))) {
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
    @Args("playerId") playerId: string
  ): Promise<Player> {
    const player = await Player.findByPk(playerId);
    if (!player) {
      throw new NotFoundException(`${Player.name}: ${playerId}`);
    }

    if (player.sub === user.sub) {
      throw new Error("You are already claimed ");
    }

    // check if null or empty
    if ((player.sub?.trim()?.length || 0) > 0) {
      throw new Error("Player is already claimed by someone else");
    }

    player.sub = user.sub;
    await player.save();

    return player;
  }

  @Mutation(() => Boolean)
  async updateSetting(@Args("settings") settingsInput: SettingUpdateInput): Promise<boolean> {
    const user = await Player.findByPk(settingsInput.playerId);
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
        await setting.save({ transaction });
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
    @Args("subscription") subscription: PushSubscriptionInputType
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
          p256dh: subscription.keys?.p256dh,
          auth: subscription.keys?.auth,
        },
      } as PushSubscription);
      settings.changed("pushSubscriptions", true);
      await settings.save();
    }

    return true;
  }

  @Mutation(() => Boolean)
  async recalculatePlayerRankingPoints(
    @User() user: Player,
    @Args("playerId", { type: () => ID }) playerId: string,
    @Args("startDate", { nullable: true }) startDate?: Date,
    @Args("endDate", { nullable: true }) endDate?: Date,
    @Args("systemId", { nullable: true }) systemId?: string
  ): Promise<boolean> {
    if (!(await user.hasAnyPermission(["re-sync:points"]))) {
      throw new UnauthorizedException(`You do not have permission to resync points`);
    }

    const player = await Player.findByPk(playerId);
    if (!player) {
      throw new NotFoundException(`${Player.name}: ${playerId}`);
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      const system = systemId
        ? await this.rankingSystemService.getById(systemId)
        : await this.rankingSystemService.getPrimary();

      if (!system) {
        throw new NotFoundException(`No ranking system found for ${systemId || "primary"}`);
      }

      // find all games
      const games = await player.getGames({
        where: {
          playedAt: {
            [Op.between]: [startDate, endDate],
          },
        },
      });

      for (const game of games) {
        await this.pointService.createRankingPointforGame(system, game, {
          transaction,
        });
      }

      this.logger.log(`Recalculated ${games.length} ranking points for player ${playerId}`);

      // Commit transaction
      await transaction.commit();

      return true;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }
}

@Resolver(() => GamePlayerMembershipType)
export class GamePlayersResolver extends PlayersResolver {
  @ResolveField(() => RankingPlace)
  async rankingPlace(
    @Parent() player: Player & { GamePlayerMembership: GamePlayerMembership },
    @Args() listArgs: WhereArgs
  ): Promise<RankingPlace> {
    const game = await Game.findByPk(player.GamePlayerMembership.gameId, {
      attributes: ["playedAt"],
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
      order: [["rankingDate", "DESC"]],
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
    @Args() listArgs: ListArgs
  ): Promise<RankingLastPlace[]> {
    const args = ListArgs.toFindOptions(listArgs);

    const primary = await this.rankingSystemService.getPrimary();
    args.where = {
      ...args.where,
      systemId: primary?.id,
      playerId: player.id,
    };

    const places = await RankingLastPlace.findAll(args);

    const findSystem = await this.loadSystemsByIds(places.map((place) => place.systemId));

    return (
      places?.map((place) => {
        const system = findSystem(place.systemId);

        if (!system) {
          throw new NotFoundException(`${RankingSystem.name}: ${place.systemId}`);
        }

        return getRankingProtected(place, system);
      }) ?? []
    );
  }

  @ResolveField(() => [RankingPlace], {
    description: "(Default) sorting: DESC \n\r(Default) take: 1",
  })
  override async rankingPlaces(
    @Parent() player: Player,
    @Args() listArgs: ListArgs
  ): Promise<RankingPlace[]> {
    const args = ListArgs.toFindOptions({
      order: [{ direction: "DESC", field: "rankingDate" }],
      take: 1,
      ...listArgs,
    });

    args.where = {
      ...args.where,
      playerId: player.id,
    };

    const places = await RankingPlace.findAll(args);

    const findSystem = await this.loadSystemsByIds(places.map((place) => place.systemId));

    return (
      places?.map((place) => {
        const system = findSystem(place.systemId);

        if (!system) {
          throw new NotFoundException(`${RankingSystem.name}: ${place.systemId}`);
        }

        return getRankingProtected(place, system);
      }) ?? []
    );
  }

  @ResolveField(() => TeamPlayerMembership, { nullable: true })
  async teamMembership(
    @Parent() player: Player & { TeamPlayerMembership: TeamPlayerMembership }
  ): Promise<TeamPlayerMembership> {
    return player.TeamPlayerMembership;
  }
}

@Resolver(() => PlayerWithClubMembershipType)
export class PlayerClubResolver extends PlayersResolver {
  @ResolveField(() => ClubPlayerMembership, { nullable: true })
  async clubMembership(
    @Parent() player: Player & { ClubPlayerMembership: ClubPlayerMembership }
  ): Promise<ClubPlayerMembership> {
    return player.ClubPlayerMembership;
  }
}
