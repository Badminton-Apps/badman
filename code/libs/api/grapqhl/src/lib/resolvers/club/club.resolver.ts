import { Club, Team } from '@badman/api/database';
import { NotFoundException } from '@nestjs/common';
import {
  Args,
  Field,
  ID,
  ObjectType,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
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
    @Args() listArgs: ListArgs,
  ): Promise<Team[]> {
    return club.getTeams(ListArgs.toFindOptions(listArgs));
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
