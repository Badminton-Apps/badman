import { User } from "@badman/backend-authorization";
import {
  Club,
  ClubNewInput,
  ClubPlayerMembership,
  ClubPlayerMembershipNewInput,
  ClubPlayerMembershipUpdateInput,
  ClubUpdateInput,
  ClubWithPlayerMembershipType,
  Comment,
  Location,
  Player,
  PlayerWithClubMembershipType,
  Role,
  Team,
} from "@badman/backend-database";
import { IsUUID } from "@badman/utils";
import { Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
import {
  Args,
  Field,
  ID,
  Int,
  Mutation,
  ObjectType,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import { GraphQLError } from "graphql";
import { Op } from "sequelize";
import { Sequelize } from "sequelize-typescript";
import { ListArgs } from "../../utils";
import { ErrorCode } from "../../utils/error-codes";
import { AddPlayerToClubResult } from "./add-player-to-club-result.object";

@ObjectType()
export class PagedClub {
  @Field(() => Int)
  count?: number;

  @Field(() => [Club])
  rows?: Club[];
}

@Resolver(() => Club)
export class ClubsResolver {
  private readonly logger = new Logger(ClubsResolver.name);

  constructor(private _sequelize: Sequelize) {}

  @Query(() => Club)
  async club(@Args("id", { type: () => ID }) id: string): Promise<Club> {
    // get club
    const club = IsUUID(id)
      ? await Club.findByPk(id)
      : await Club.findOne({
          where: {
            slug: id,
          },
        });

    if (!club) {
      throw new NotFoundException(id);
    }
    return club;
  }

  @Query(() => PagedClub)
  async clubs(@Args() listArgs: ListArgs): Promise<{ count: number; rows: Club[] }> {
    return Club.findAndCountAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [Team])
  async teams(@Parent() club: Club, @Args() listArgs: ListArgs): Promise<Team[]> {
    return club.getTeams(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [Location])
  async locations(@Parent() club: Club, @Args() listArgs: ListArgs): Promise<Location[]> {
    return club.getLocations(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [Comment])
  async comments(@Parent() club: Club, @Args() listArgs: ListArgs): Promise<Comment[]> {
    return club.getComments(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [Role])
  async roles(@Parent() club: Club, @Args() listArgs: ListArgs): Promise<Role[]> {
    return club.getRoles(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [PlayerWithClubMembershipType])
  async players(
    @Parent() club: Club,
    @Args() listArgs: ListArgs,
    @Args("active", { type: () => Boolean, nullable: true, defaultValue: true }) active = true
  ): Promise<(Player & { ClubMembership: ClubPlayerMembership })[] | Player[] | undefined> {
    const options = ListArgs.toFindOptions(listArgs);

    if (active) {
      /*
      see: ClubPlayerMembership.active
      // but this prevents fetching it from the database to speed up the query
     active =  (
      this.confirmed &&
      this.start &&
      this.start < new Date() &&
      (!this.end || this.end > new Date())
    );
    */

      options.where = {
        ...options.where,

        //TODO - uncomment this
        // [`$${ClubPlayerMembership.name}.start$`]: {
        //   [Op.lt]: new Date(),
        // },
        // [Op.or]: [
        //   {
        //     [`$${ClubPlayerMembership.name}.end$`]: {
        //       [Op.gt]: new Date(),
        //     },
        //   },
        //   {
        //     [`$${ClubPlayerMembership.name}.end$`]: {
        //       [Op.is]: null,
        //     },
        //   },
        // ],
        [`$${ClubPlayerMembership.name}.confirmed$`]: true,
      };
    }

    const players = (await club.getPlayers(options)) as (Player & {
      ClubMembership: ClubPlayerMembership;
    })[];

    // if (active) {
    //   players = players.filter((player) => player.ClubMembership.active);
    // }

    const distinctPlayers = players.filter(
      (player, index, self) => index === self.findIndex((p) => p.id === player.id)
    );
    return distinctPlayers;
  }

  @Mutation(() => Club)
  async createClub(@User() user: Player, @Args("data") newClubData: ClubNewInput) {
    if (!(await user.hasAnyPermission(["add:club"]))) {
      throw new UnauthorizedException(`You do not have permission to add a club`);
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      if (!newClubData.name) {
        throw new Error("Club name is required");
      }

      const clubDb = await Club.create(
        { ...newClubData, name: newClubData.name as string },
        { transaction }
      );

      // Commit transaction
      await transaction.commit();

      return clubDb;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  @Mutation(() => Club)
  async removeClub(@User() user: Player, @Args("id", { type: () => ID }) id: string) {
    if (!(await user.hasAnyPermission(["remove:club"]))) {
      throw new UnauthorizedException(`You do not have permission to add a club`);
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      const clubDb = await Club.findByPk(id, { transaction });

      if (!clubDb) {
        throw new NotFoundException(`${Club.name}: ${id}`);
      }

      await clubDb.destroy({ transaction });

      // Commit transaction
      await transaction.commit();

      return clubDb;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  @Mutation(() => Club)
  async updateClub(@User() user: Player, @Args("data") updateClubData: ClubUpdateInput) {
    if (!(await user.hasAnyPermission([`${updateClubData.id}_edit:club`, "edit-any:club"]))) {
      throw new UnauthorizedException(`You do not have permission to edit this club`);
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      const clubDb = await Club.findByPk(updateClubData.id, { transaction });

      if (!clubDb) {
        throw new NotFoundException(`${Club.name}: ${updateClubData.id}`);
      }

      // If the abbreviation is changed, we need to update the teams
      if (updateClubData.abbreviation !== clubDb.abbreviation) {
        const teams = await clubDb.getTeams({
          transaction,
        });
        this.logger.debug(`updating teams ${teams.length}`);
        for (const team of teams) {
          await Team.generateName(team, { transaction });
          await team.save({ transaction });
        }
      }

      // Update club
      const result = await clubDb.update(updateClubData, { transaction });

      // Commit transaction
      await transaction.commit();

      return result;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }

  @Mutation(() => AddPlayerToClubResult)
  async addPlayerToClub(
    @User() user: Player,
    @Args("data") addPlayerToClubData: ClubPlayerMembershipNewInput
  ): Promise<AddPlayerToClubResult> {
    if (
      !(await user.hasAnyPermission([`${addPlayerToClubData.clubId}_edit:club`, "edit-any:club"]))
    ) {
      throw new GraphQLError("Permission denied", {
        extensions: { code: ErrorCode.PERMISSION_DENIED },
      });
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      const club = await Club.findByPk(addPlayerToClubData.clubId, {
        transaction,
      });

      if (!club) {
        throw new GraphQLError("Club not found", {
          extensions: { code: ErrorCode.CLUB_NOT_FOUND, clubId: addPlayerToClubData.clubId },
        });
      }

      const player = await Player.findByPk(addPlayerToClubData.playerId, {
        transaction,
      });

      if (!player) {
        throw new GraphQLError("Player not found", {
          extensions: {
            code: ErrorCode.PLAYER_NOT_FOUND,
            playerId: addPlayerToClubData.playerId,
          },
        });
      }

      const confirmed = await user.hasAnyPermission(["change:transfer"]);

      const clubId = addPlayerToClubData.clubId as string;
      const playerId = addPlayerToClubData.playerId as string;
      const start = addPlayerToClubData.start as Date;

      // Idempotent create: findOrCreate on natural key (clubId, playerId, start)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [membership, created] = await (ClubPlayerMembership as any).findOrCreate({
        where: { clubId, playerId, start },
        defaults: {
          start,
          end: addPlayerToClubData.end,
          membershipType: addPlayerToClubData.membershipType,
          confirmed,
        },
        transaction,
      });

      // Commit transaction
      await transaction.commit();

      return {
        id: membership.id as string,
        clubId,
        playerId,
        start: membership.start as Date,
        end: (membership.end as Date | null | undefined) ?? null,
        membershipType: membership.membershipType as string,
        alreadyExisted: !created,
      };
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }
  }
  @Mutation(() => Boolean)
  async updateClubPlayerMembership(
    @User() user: Player,
    @Args("data")
    updateClubPlayerMembershipData: ClubPlayerMembershipUpdateInput
  ) {
    const membership = await ClubPlayerMembership.findByPk(updateClubPlayerMembershipData.id);

    if (!membership) {
      throw new GraphQLError("Membership not found", {
        extensions: {
          code: ErrorCode.MEMBERSHIP_NOT_FOUND,
          membershipId: updateClubPlayerMembershipData.id,
        },
      });
    }

    if (!(await user.hasAnyPermission([`${membership.clubId}_edit:club`, "edit-any:club"]))) {
      throw new GraphQLError("Permission denied", {
        extensions: { code: ErrorCode.PERMISSION_DENIED },
      });
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      await membership.update(updateClubPlayerMembershipData, {
        transaction,
      });

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
  async removePlayerFromClub(@User() user: Player, @Args("id", { type: () => ID }) id: string) {
    const membership = await ClubPlayerMembership.findByPk(id);

    if (!membership) {
      throw new GraphQLError("Membership not found", {
        extensions: { code: ErrorCode.MEMBERSHIP_NOT_FOUND, membershipId: id },
      });
    }

    if (!(await user.hasAnyPermission([`${membership.clubId}_edit:club`, "edit-any:club"]))) {
      throw new GraphQLError("Permission denied", {
        extensions: { code: ErrorCode.PERMISSION_DENIED },
      });
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      // remove membership
      await membership.destroy({ transaction });

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

@Resolver(() => ClubWithPlayerMembershipType)
export class ClubPlayerResolver extends ClubsResolver {
  @ResolveField(() => ClubPlayerMembership, { nullable: true })
  async clubMembership(
    @Parent() club: Club & { ClubPlayerMembership: ClubPlayerMembership }
  ): Promise<ClubPlayerMembership> {
    return club.ClubPlayerMembership;
  }
}
