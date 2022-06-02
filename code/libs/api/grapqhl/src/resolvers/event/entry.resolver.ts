import {
  DrawCompetition,
  DrawTournament,
  EventEntry,
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
import { ListArgs, queryFixer } from '../../utils';

@Resolver(() => EventEntry)
export class EventEntryResolver {
  @Query(() => EventEntry)
  async eventEntry(
    @Args('id', { type: () => ID }) id: string
  ): Promise<EventEntry> {
    let eventEntry = await EventEntry.findByPk(id);

    if (!eventEntry) {
      eventEntry = await EventEntry.findOne({
        where: {
          slug: id,
        },
      });
    }

    if (!eventEntry) {
      throw new NotFoundException(id);
    }
    return eventEntry;
  }

  @Query(() => [EventEntry])
  async eventEntries(@Args() listArgs: ListArgs): Promise<EventEntry[]> {
    return EventEntry.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => [SubEventCompetition])
  async competitionSubEvent(
    @Parent() eventEntry: EventEntry
  ): Promise<SubEventCompetition> {
    return eventEntry.getCompetitionSubEvent();
  }

  @ResolveField(() => [DrawCompetition])
  async getCompetitionDraw(
    @Parent() eventEntry: EventEntry
  ): Promise<DrawCompetition> {
    return eventEntry.getCompetitionDraw();
  }

  @ResolveField(() => [DrawTournament])
  async getTournamentDraw(
    @Parent() eventEntry: EventEntry
  ): Promise<DrawTournament> {
    return eventEntry.getTournamentDraw();
  }
  @ResolveField(() => [DrawTournament])
  async getTournamentSubEvent(
    @Parent() eventEntry: EventEntry
  ): Promise<SubEventTournament> {
    return eventEntry.getTournamentSubEvent();
  }

  // @Mutation(returns => EventEntry)
  // async addEventEntry(
  //   @Args('newEventEntryData') newEventEntryData: NewEventEntryInput,
  // ): Promise<EventEntry> {
  //   const recipe = await this.recipesService.create(newEventEntryData);
  //   return recipe;
  // }

  // @Mutation(returns => Boolean)
  // async removeEventEntry(@Args('id') id: string) {
  //   return this.recipesService.remove(id);
  // }
}
