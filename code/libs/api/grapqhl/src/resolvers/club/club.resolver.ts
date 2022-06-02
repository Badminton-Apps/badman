import {
  Club,
  Location,
  Role,
  Team,
  ClubUpdateInput,
  Player,
} from '@badman/api/database';
import {
  Inject,
  Logger,
  NotFoundException,
  UnauthorizedException,
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
import { Sequelize } from 'sequelize-typescript';
import { User } from '../../decorators';
import { ListArgs } from '../../utils';

@ObjectType()
export class PagedClub {
  @Field()
  count: number;

  @Field(() => [Club])
  rows: Club[];
}

@Resolver(() => Club)
export class ClubsResolver {
  private readonly logger = new Logger(ClubsResolver.name);

  constructor(@Inject('SEQUELIZE') private _sequelize: Sequelize) {}

  @Query(() => Club)
  async club(@Args('id', { type: () => ID }) id: string): Promise<Club> {
    let club = await Club.findByPk(id);

    if (!club) {
      club = await Club.findOne({
        where: {
          slug: id,
        },
      });
    }

    if (!club) {
      throw new NotFoundException(id);
    }
    return club;
  }

  @Query(() => PagedClub)
  async clubs(
    @Args() listArgs: ListArgs
  ): Promise<{ count: number; rows: Club[] }> {
    return Club.findAndCountAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [Team])
  async teams(
    @Parent() club: Club,
    @Args() listArgs: ListArgs
  ): Promise<Team[]> {
    return club.getTeams(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [Location])
  async locations(
    @Parent() club: Club,
    @Args() listArgs: ListArgs
  ): Promise<Location[]> {
    return club.getLocations(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [Role])
  async roles(
    @Parent() club: Club,
    @Args() listArgs: ListArgs
  ): Promise<Role[]> {
    return club.getRoles(ListArgs.toFindOptions(listArgs));
  }

  // @Mutation(returns => Club)
  // async addClub(
  //   @Args('newClubData') newClubData: NewClubInput,
  // ): Promise<Club> {
  //   const recipe = await this.recipesService.create(newClubData);
  //   return recipe;
  // }

  // @Mutation(returns => Boolean)
  // async removeClub(@Args('id') id: string) {
  //   return this.recipesService.remove(id);
  // }

  @Mutation(() => Club)
  async updateClub(
    @User() user: Player,
    @Args('updateClubData') updateClubData: ClubUpdateInput
  ) {
    if (
      !user.hasAnyPermission([
        `${updateClubData.id}_edit:club`,
        'edit-any:club',
      ])
    ) {
      throw new UnauthorizedException(
        `You do not have permission to edit this club`
      );
    }

    // Do transaction
    const transaction = await this._sequelize.transaction();
    try {
      let club = await Club.findByPk(updateClubData.id, { transaction });

      if (!club) {
        throw new NotFoundException(updateClubData.id);
      }

      // If the abbreviation is changed, we need to update the teams
      if (updateClubData.abbreviation !== club.abbreviation) {
        const teams = await club.getTeams({
          where: { active: true },
          transaction,
        });
        this.logger.debug(`updating teams ${teams.length}`);
        for (const team of teams) {
          await Team.generateAbbreviation(team, { transaction });
          await team.save({ transaction });
        }
      }

      // Update club
      const result = await club.update(updateClubData, { transaction });

      // Commit transaction
      await transaction.commit();

      return result;
    } catch (error) {
      this.logger.error(error);
      await transaction.rollback();
      throw error;
    }

    Logger.debug('transaction complete');
  }
}
