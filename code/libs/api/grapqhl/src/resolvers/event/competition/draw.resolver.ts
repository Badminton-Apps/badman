import {
  DrawCompetition,
  SubEventCompetition
} from '@badman/api/database';
import { NotFoundException } from '@nestjs/common';
import {
  Args,
  ID,
  Parent,
  Query,
  ResolveField,
  Resolver
} from '@nestjs/graphql';
import { ListArgs } from '../../../utils';

@Resolver(() => DrawCompetition)
export class DrawCompetitionResolver {
  @Query(() => DrawCompetition)
  async drawCompetition(
    @Args('id', { type: () => ID }) id: string
  ): Promise<DrawCompetition> {
    let drawCompetition = await DrawCompetition.findByPk(id);

    if (!drawCompetition) {
      drawCompetition = await DrawCompetition.findOne({
        where: {
          slug: id,
        },
      });
    }

    if (!drawCompetition) {
      throw new NotFoundException(id);
    }
    return drawCompetition;
  }

  @Query(() => [DrawCompetition])
  async drawCompetitions(
    @Args() listArgs: ListArgs
  ): Promise<DrawCompetition[]> {
    return DrawCompetition.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => SubEventCompetition)
  async subEventCompetition(
    @Parent() draw: DrawCompetition
  ): Promise<SubEventCompetition> {
    return draw.getSubEvent();
  }

  // @Mutation(returns => DrawCompetition)
  // async addDrawCompetition(
  //   @Args('newDrawCompetitionData') newDrawCompetitionData: NewDrawCompetitionInput,
  // ): Promise<DrawCompetition> {
  //   const recipe = await this.recipesService.create(newDrawCompetitionData);
  //   return recipe;
  // }

  // @Mutation(returns => Boolean)
  // async removeDrawCompetition(@Args('id') id: string) {
  //   return this.recipesService.remove(id);
  // }
}
