import { EventCompetition, SubEventCompetition } from '@badman/api/database';
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
import { ListArgs } from '../../../utils';

@ObjectType()
export class PagedEventCompetition {
  @Field()
  count: number;

  @Field(() => [EventCompetition])
  rows: EventCompetition[];
}
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

  @Query(() => PagedEventCompetition)
  async eventCompetitions(
    @Args() listArgs: ListArgs
  ): Promise<{ count: number; rows: EventCompetition[] }> {
    return EventCompetition.findAndCountAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [SubEventCompetition])
  async subEventCompetitions(
    @Parent() event: EventCompetition,
    @Args() listArgs: ListArgs
  ): Promise<SubEventCompetition[]> {
    return event.getSubEventCompetitions(ListArgs.toFindOptions(listArgs));
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
