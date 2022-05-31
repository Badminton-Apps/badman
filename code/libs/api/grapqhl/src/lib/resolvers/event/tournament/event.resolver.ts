import { EventTournament, SubEventTournament } from '@badman/api/database';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Parent, Query, Resolver } from '@nestjs/graphql';
import { ListArgs } from '../../../utils';

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

  @Query(() => [EventTournament])
  async eventTournaments(
    @Args() listArgs: ListArgs
  ): Promise<EventTournament[]> {
    return EventTournament.findAll(ListArgs.toFindOptions(listArgs));
  }

  @Query(() => [SubEventTournament])
  async subEvents(
    @Parent() event: EventTournament,
    @Args() listArgs: ListArgs
  ): Promise<SubEventTournament[]> {
    return event.getSubEvents(ListArgs.toFindOptions(listArgs));
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
