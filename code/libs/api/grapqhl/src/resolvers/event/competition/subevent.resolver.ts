import { EventCompetition, SubEventCompetition } from '@badman/api/database';
import { NotFoundException } from '@nestjs/common';
import {
  Args,
  ID,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { ListArgs } from '../../../utils';

@Resolver(() => SubEventCompetition)
export class SubEventCompetitionResolver {
  @Query(() => SubEventCompetition)
  async encounterCompetition(
    @Args('id', { type: () => ID }) id: string
  ): Promise<SubEventCompetition> {
    let encounterCompetition = await SubEventCompetition.findByPk(id);

    if (!encounterCompetition) {
      encounterCompetition = await SubEventCompetition.findOne({
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

  @Query(() => [SubEventCompetition])
  async encounterCompetitions(
    @Args() listArgs: ListArgs
  ): Promise<SubEventCompetition[]> {
    return SubEventCompetition.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => EventCompetition)
  async event(
    @Parent() subEvent: SubEventCompetition
  ): Promise<EventCompetition> {
    return subEvent.getEvent();
  }

  // @Mutation(returns => SubEventCompetition)
  // async addSubEventCompetition(
  //   @Args('newSubEventCompetitionData') newSubEventCompetitionData: NewSubEventCompetitionInput,
  // ): Promise<SubEventCompetition> {
  //   const recipe = await this.recipesService.create(newSubEventCompetitionData);
  //   return recipe;
  // }

  // @Mutation(returns => Boolean)
  // async removeSubEventCompetition(@Args('id') id: string) {
  //   return this.recipesService.remove(id);
  // }
}
