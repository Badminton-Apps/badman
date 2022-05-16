import { EventTournament } from '@badman/api/database';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { ListArgs, queryFixer } from '../../../utils';

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
    return EventTournament.findAll({
      limit: listArgs.take,
      offset: listArgs.skip,
      where: queryFixer(listArgs.where),
    });
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
