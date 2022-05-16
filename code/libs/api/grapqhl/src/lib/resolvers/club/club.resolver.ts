import { Club, Team } from '@badman/api/database';
import { NotFoundException } from '@nestjs/common';
import {
  Args,
  ID,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { ListArgs, queryFixer } from '../../utils';

@Resolver(() => Club)
export class ClubsResolver {
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

  @Query(() => [Club])
  async clubs(@Args() listArgs: ListArgs): Promise<Club[]> {
    return Club.findAll({
      limit: listArgs.take,
      offset: listArgs.skip,
      where: queryFixer(listArgs.where),
    });
  }

  @ResolveField(() => [Team])
  async teams(
    @Parent() club: Club,
    @Args('includeDisabled', { nullable: true }) disabled?: boolean
  ): Promise<Team[]> {
    return club.getTeams({
      where: {
        active: disabled === undefined ? true : undefined,
      },
    });
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
}
