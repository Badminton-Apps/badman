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
  async encounterCompetition(
    @Args('id', { type: () => ID }) id: string
  ): Promise<DrawCompetition> {
    let encounterCompetition = await DrawCompetition.findByPk(id);

    if (!encounterCompetition) {
      encounterCompetition = await DrawCompetition.findOne({
        where: {
          slug: id,
        },
      });
    }

    if (!encounterCompetition) {
      throw new NotFoundException(id);
    }
    return encounterCompetition;
  }

  @Query(() => [DrawCompetition])
  async encounterCompetitions(
    @Args() listArgs: ListArgs
  ): Promise<DrawCompetition[]> {
    return DrawCompetition.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => SubEventCompetition)
  async subEvent(
    @Parent() encounter: DrawCompetition
  ): Promise<SubEventCompetition> {
    return encounter.getSubEvent();
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
