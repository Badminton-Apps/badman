import { User } from '@badman/backend-authorization';
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
} from '@badman/backend-database';
import { IsUUID } from '@badman/utils';
import { Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
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
} from '@nestjs/graphql';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { ListArgs } from '../../utils';

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
  async club(@Args('id', { type: () => ID }) id: string): Promise<Club> {
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
    @Args('active', { type: () => Boolean, nullable: true, defaultValue: true }) active = true,
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

        [`$${ClubPlayerMembership.name}.start$`]: {
          [Op.lt]: new Date(),
        },
        [Op.or]: [
          {
            [`$${ClubPlayerMembership.name}.end$`]: {
              [Op.gt]: new Date(),
            },
          },
          {
            [`$${ClubPlayerMembership.name}.end$`]: {
              [Op.is]: null,
            },
          },
        ],
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
      (player, index, self) => index === self.findIndex((p) => p.id === player.id),
    );
    return distinctPlayers;
  }

  @Mutation(() => Club)
  async createClub(@User() user: Player, @Args('data') newClubData: ClubNewInput) {
    if (!(await user.hasAnyPermission(['add:club']))) {
      throw new UnauthorizedException(`You do not have permission to add a club`);
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      const clubDb = await Club.create({ ...newClubData }, { transaction });

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
  async removeClub(@User() user: Player, @Args('id', { type: () => ID }) id: string) {
    if (!(await user.hasAnyPermission(['remove:club']))) {
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
  async updateClub(@User() user: Player, @Args('data') updateClubData: ClubUpdateInput) {
    if (!(await user.hasAnyPermission([`${updateClubData.id}_edit:club`, 'edit-any:club']))) {
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

  @Mutation(() => Boolean)
  async addPlayerToClub(
    @User() user: Player,
    @Args('data') addPlayerToClubData: ClubPlayerMembershipNewInput,
  ) {
    if (
      !(await user.hasAnyPermission([`${addPlayerToClubData.clubId}_edit:club`, 'edit-any:club']))
    ) {
      throw new UnauthorizedException(`You do not have permission to edit this club`);
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      const club = await Club.findByPk(addPlayerToClubData.clubId, {
        transaction,
      });
      const player = await Player.findByPk(addPlayerToClubData.playerId, {
        transaction,
      });

      if (!club) {
        throw new NotFoundException(`${Club.name}: ${addPlayerToClubData.clubId}`);
      }
      if (!player) {
        throw new NotFoundException(`${Player.name}: ${addPlayerToClubData.playerId}`);
      }

      const confirmed = await user.hasAnyPermission(['change:transfer']);

      // Add player to club
      await club.addPlayer(player, {
        transaction,
        through: {
          start: addPlayerToClubData.start,
          end: addPlayerToClubData.end,
          membershipType: addPlayerToClubData.membershipType,
          confirmed,
        },
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
  async updateClubPlayerMembership(
    @User() user: Player,
    @Args('data')
    updateClubPlayerMembershipData: ClubPlayerMembershipUpdateInput,
  ) {
    const membership = await ClubPlayerMembership.findByPk(updateClubPlayerMembershipData.id);

    if (!membership) {
      throw new NotFoundException(
        `${ClubPlayerMembership.name}: ${updateClubPlayerMembershipData.id}`,
      );
    }

    if (!(await user.hasAnyPermission([`${membership.clubId}_edit:club`, 'edit-any:club']))) {
      throw new UnauthorizedException(`You do not have permission to edit this club`);
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
  async removePlayerFromClub(@User() user: Player, @Args('id', { type: () => ID }) id: string) {
    const membership = await ClubPlayerMembership.findByPk(id);

    if (!membership) {
      throw new NotFoundException(`${ClubPlayerMembership.name}: ${id}`);
    }

    if (!(await user.hasAnyPermission([`${membership.clubId}_edit:club`, 'edit-any:club']))) {
      throw new UnauthorizedException(`You do not have permission to edit this club`);
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      const club = await Club.findByPk(membership.clubId, { transaction });
      const player = await Player.findByPk(membership.playerId, {
        transaction,
      });

      if (!club) {
        throw new NotFoundException(`${Club.name}: ${membership.clubId}`);
      }
      if (!player) {
        throw new NotFoundException(`${Player.name}: ${membership.playerId}`);
      }

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
    @Parent() club: Club & { ClubPlayerMembership: ClubPlayerMembership },
  ): Promise<ClubPlayerMembership> {
    return club.ClubPlayerMembership;
  }
}
