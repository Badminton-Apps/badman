import { EventCompetition } from '@badman/api/database';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { ListArgs, queryFixer } from '../../../utils';

@Resolver(() => EventCompetition)
export class EventCompetitionResolver {
  @Query(() => EventCompetition)
  async eventCompetition(
    @Args('id', { type: () => ID }) id: string
  ): Promise<EventCompetition> {
    let eventCompetition = await EventCompetition.findByPk(id);

    if (!eventCompetition) {
      eventCompetition = await EventCompetition.findOne({
        where: {
          slug: id,
        },
      });
    }

    if (!eventCompetition) {
      throw new NotFoundException(id);
    }
    return eventCompetition;
  }

  @Query(() => [EventCompetition])
  async eventCompetitions(
    @Args() listArgs: ListArgs
  ): Promise<EventCompetition[]> {
    return EventCompetition.findAll({
      limit: listArgs.take,
      offset: listArgs.skip,
      where: queryFixer(listArgs.where),
    });
  }

  // @Mutation(returns => EventCompetition)
  // async addEventCompetition(
  //   @Args('newEventCompetitionData') newEventCompetitionData: NewEventCompetitionInput,
  // ): Promise<EventCompetition> {
  //   const recipe = await this.recipesService.create(newEventCompetitionData);
  //   return recipe;
  // }

  // @Mutation(returns => Boolean)
  // async removeEventCompetition(@Args('id') id: string) {
  //   return this.recipesService.remove(id);
  // }
}
