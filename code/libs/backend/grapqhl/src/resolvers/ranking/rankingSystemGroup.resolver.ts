import {
  RankingGroup,
  SubEventCompetition,
  SubEventTournament,
} from '@badman/backend/database';
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

@Resolver(() => RankingGroup)
export class RankingGroupsResolver {
  @Query(() => RankingGroup)
  async rankingGroup(
    @Args('id', { type: () => ID }) id: string
  ): Promise<RankingGroup> {
    let rankingSystemGroup = await RankingGroup.findByPk(id);

    if (!rankingSystemGroup) {
      rankingSystemGroup = await RankingGroup.findOne({
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

  @Query(() => [RankingGroup])
  async rankingGroups(@Args() listArgs: ListArgs): Promise<RankingGroup[]> {
    return RankingGroup.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [SubEventCompetition])
  async subEventCompetitions(
    @Parent() group: RankingGroup,
    @Args() listArgs: ListArgs
  ): Promise<SubEventCompetition[]> {
    return group.getSubEventCompetitions(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [SubEventTournament])
  async subEventTournaments(
    @Parent() group: RankingGroup,
    @Args() listArgs: ListArgs
  ): Promise<SubEventTournament[]> {
    return group.getSubEventTournaments(ListArgs.toFindOptions(listArgs));
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
