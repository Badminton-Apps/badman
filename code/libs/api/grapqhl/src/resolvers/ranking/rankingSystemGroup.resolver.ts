import {
  RankingGroups,
  SubEventCompetition,
  SubEventTournament,
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

@Resolver(() => RankingGroups)
export class RankingSystemGroupResolver {
  @Query(() => RankingGroups)
  async rankingSystemGroup(
    @Args('id', { type: () => ID }) id: string
  ): Promise<RankingGroups> {
    let rankingSystemGroup = await RankingGroups.findByPk(id);

    if (!rankingSystemGroup) {
      rankingSystemGroup = await RankingGroups.findOne({
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

  @Query(() => [RankingGroups])
  async RankingGroups(
    @Args() listArgs: ListArgs
  ): Promise<RankingGroups[]> {
    return RankingGroups.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [SubEventCompetition])
  async subEventCompetitions(
    @Parent() group: RankingGroups,
    @Args() listArgs: ListArgs
  ): Promise<SubEventCompetition[]> {
    return group.getSubEventCompetitions(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [SubEventTournament])
  async subEventTournaments(
    @Parent() group: RankingGroups,
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
