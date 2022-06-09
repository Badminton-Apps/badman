import {
  RankingLastPlace,
  RankingSystem,
  RankingGroup,
  PagedRankingLastPlaces,
} from '@badman/api/database';
import { NotFoundException } from '@nestjs/common';
import {
  Args,
  ID,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { ListArgs } from '../../utils';

@Resolver(() => RankingSystem)
export class RankingSystemResolver {
  @Query(() => RankingSystem)
  async rankingSystem(
    @Args('id', { type: () => ID }) id: string
  ): Promise<RankingSystem> {
    let rankingSystem = await RankingSystem.findByPk(id);

    if (!rankingSystem) {
      rankingSystem = await RankingSystem.findOne({
        where: {
          slug: id,
        },
      });
    }

    if (!rankingSystem) {
      throw new NotFoundException(id);
    }
    return rankingSystem;
  }

  @Query(() => [RankingSystem])
  async rankingSystems(@Args() listArgs: ListArgs): Promise<RankingSystem[]> {
    return RankingSystem.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => PagedRankingLastPlaces)
  async rankingLastPlaces(
    @Parent() system: RankingSystem,
    @Args() listArgs: ListArgs
  ): Promise<{
    count: number;
    rows: RankingLastPlace[];
  }> {
    return RankingLastPlace.findAndCountAll({
      ...ListArgs.toFindOptions(listArgs),
      where: {
        systemId: system.id,
      },
    });
  }

  @ResolveField(() => [RankingGroup])
  async rankingGroups(
    @Parent() system: RankingSystem,
    @Args() listArgs: ListArgs
  ): Promise<RankingGroup[]> {
    return system.getRankingGroups(ListArgs.toFindOptions(listArgs));
  }

  // @Mutation(returns => RankingSystem)
  // async RankingSystem(
  //   @Args('RankingSystemData') RankingSystemData: RankingSystemInput,
  // ): Promise<RankingSystem> {
  //   const recipe = await this.recipesService.create(RankingSystemData);
  //   return recipe;
  // }

  // @Mutation(returns => Boolean)
  // async RankingSystem(@Args('id') id: string) {
  //   return this.recipesService.remove(id);
  // }
}
