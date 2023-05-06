import {
  DrawCompetition,
  DrawTournament,
  EntryCompetitionPlayers,
  EntryCompetitionPlayersType,
  EventEntry,
  Player,
  Standing,
  SubEventCompetition,
  SubEventTournament,
  Team,
} from '@badman/backend-database';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
  Args,
  ID,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { ListArgs } from '../../utils';
import { NotificationService } from '@badman/backend-notifications';
import { User } from '@badman/backend-authorization';

@Resolver(() => EventEntry)
export class EventEntryResolver {
  constructor(private notificationService: NotificationService) {}

  @Query(() => EventEntry)
  async eventEntry(
    @Args('id', { type: () => ID }) id: string
  ): Promise<EventEntry> {
    const eventEntry = await EventEntry.findByPk(id);

    if (!eventEntry) {
      throw new NotFoundException(id);
    }
    return eventEntry;
  }

  @Query(() => [EventEntry])
  async eventEntries(@Args() listArgs: ListArgs): Promise<EventEntry[]> {
    return EventEntry.findAll(ListArgs.toFindOptions(listArgs));
  }

  @ResolveField(() => Team)
  async team(@Parent() eventEntry: EventEntry): Promise<Team> {
    return eventEntry.getTeam();
  }

  @ResolveField(() => [Player])
  async players(@Parent() eventEntry: EventEntry): Promise<Player[]> {
    return eventEntry.getPlayers();
  }

  @ResolveField(() => SubEventCompetition)
  async subEventCompetition(
    @Parent() eventEntry: EventEntry
  ): Promise<SubEventCompetition> {
    return eventEntry.getSubEventCompetition();
  }
  @ResolveField(() => DrawCompetition)
  async drawCompetition(
    @Parent() eventEntry: EventEntry
  ): Promise<DrawCompetition> {
    return eventEntry.getDrawCompetition();
  }

  @ResolveField(() => [DrawTournament])
  async drawTournament(
    @Parent() eventEntry: EventEntry
  ): Promise<DrawTournament> {
    return eventEntry.getDrawTournament();
  }
  @ResolveField(() => [DrawTournament])
  async subEventTournament(
    @Parent() eventEntry: EventEntry
  ): Promise<SubEventTournament> {
    return eventEntry.getSubEventTournament();
  }

  @ResolveField(() => Standing, { nullable: true })
  async standing(@Parent() eventEntry: EventEntry): Promise<Standing> {
    return eventEntry.getStanding();
  }

  @Mutation(() => Boolean)
  async finishEventEntry(
    @User() user: Player,
    @Args('clubId', { type: () => ID }) clubId: string,
    @Args('season', { type: () => Int }) season: number,
    @Args('email', { type: () => String }) email: string,
  ) {
    if (!user.hasAnyPermission([clubId + '_edit:club', 'edit-any:club'])) {
      throw new UnauthorizedException(
        `You do not have permission to enroll a club`
      );
    }

    await this.notificationService.notifyEnrollment(user.id, clubId, season, email);

    return true;
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

@Resolver(() => EntryCompetitionPlayersType)
export class EntryCompetitionPlayersResolver {
  @ResolveField(() => Player)
  async player(
    @Parent() eventEntryPlayer: EntryCompetitionPlayers
  ): Promise<Player> {
    return await Player.findByPk(eventEntryPlayer.id);
  }
}
