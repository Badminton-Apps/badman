import { RankingSystemGroup } from '@badman/api/database';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { ListArgs, queryFixer } from '../../utils';

@Resolver(() => RankingSystemGroup)
export class RankingSystemGroupResolver {
  @Query(() => RankingSystemGroup)
  async rankingSystemGroup(
    @Args('id', { type: () => ID }) id: string
  ): Promise<RankingSystemGroup> {
    let rankingSystemGroup = await RankingSystemGroup.findByPk(id);

    if (!rankingSystemGroup) {
      rankingSystemGroup = await RankingSystemGroup.findOne({
        where: {
          slug: id,
        },
      });
    }

    if (!rankingSystemGroup) {
      throw new NotFoundException(id);
    }
    return rankingSystemGroup;
  }

  @Query(() => [RankingSystemGroup])
  async rankingSystemGroups(
    @Args() listArgs: ListArgs
  ): Promise<RankingSystemGroup[]> {
    return RankingSystemGroup.findAll({
      limit: listArgs.take,
      offset: listArgs.skip,
      where: queryFixer(listArgs.where),
    });
  }

  // @Mutation(returns => RankingSystemGroup)
  // async RankingSystemGroup(
  //   @Args('RankingSystemGroupData') RankingSystemGroupData: RankingSystemGroupInput,
  // ): Promise<RankingSystemGroup> {
  //   const recipe = await this.recipesService.create(RankingSystemGroupData);
  //   return recipe;
  // }

  // @Mutation(returns => Boolean)
  // async RankingSystemGroup(@Args('id') id: string) {
  //   return this.recipesService.remove(id);
  // }
}
