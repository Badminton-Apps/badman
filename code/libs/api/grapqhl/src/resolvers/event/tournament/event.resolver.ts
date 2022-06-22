import {
  EventTournament,
  RankingGroup,
  SubEventTournament,
} from '@badman/api/database';
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
export class PagedEventTournament {
  @Field()
  count: number;

  @Field(() => [EventTournament])
  rows: EventTournament[];
}

@Resolver(() => EventTournament)
export class EventTournamentResolver {
  @Query(() => EventTournament)
  async eventTournament(
    @Args('id', { type: () => ID }) id: string
  ): Promise<EventTournament> {
    let eventTournament = await EventTournament.findByPk(id);

    if (!eventTournament) {
      eventTournament = await EventTournament.findOne({
        where: {
          slug: id,
        },
      });
    }

    if (!eventTournament) {
      throw new NotFoundException(id);
    }
    return eventTournament;
  }

  @Query(() => PagedEventTournament)
  async eventTournaments(
    @Args() listArgs: ListArgs
  ): Promise<{ count: number; rows: EventTournament[] }> {
    return EventTournament.findAndCountAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [SubEventTournament])
  async subEventTournaments(
    @Parent() event: EventTournament,
    @Args() listArgs: ListArgs
  ): Promise<SubEventTournament[]> {
    return event.getSubEventTournaments(ListArgs.toFindOptions(listArgs));
  }


  // @Mutation(returns => EventTournament)
  // async addEventTournament(
  //   @Args('newEventTournamentData') newEventTournamentData: NewEventTournamentInput,
  // ): Promise<EventTournament> {
  //   const recipe = await this.recipesService.create(newEventTournamentData);
  //   return recipe;
  // }

  // @Mutation(returns => Boolean)
  // async removeEventTournament(@Args('id') id: string) {
  //   return this.recipesService.remove(id);
  // }
}
