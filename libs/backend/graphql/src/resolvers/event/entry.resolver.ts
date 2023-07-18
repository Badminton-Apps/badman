import { User } from '@badman/backend-authorization';
import {
  DrawCompetition,
  DrawTournament,
  EntryCompetitionPlayer,
  EntryCompetitionPlayersType,
  EventEntry,
  Player,
  Standing,
  SubEventCompetition,
  SubEventTournament,
  Team,
} from '@badman/backend-database';
import {
  EnrollmentValidationService,
  TeamEnrollmentOutput,
} from '@badman/backend-enrollment';
import { NotificationService } from '@badman/backend-notifications';
import { TeamMembershipType } from '@badman/utils';
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

@Resolver(() => EventEntry)
export class EventEntryResolver {
  constructor(
    private notificationService: NotificationService,
    private enrollmentService: EnrollmentValidationService
  ) {}

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
  @ResolveField(() => DrawCompetition, { nullable: true })
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

  @ResolveField(() => TeamEnrollmentOutput, {
    description: `Validate the enrollment\n\r**note**: the levels are the ones from may!`,
  })
  async enrollmentValidation(
    @Parent() eventEntry: EventEntry
  ): Promise<TeamEnrollmentOutput | null> {
    const team = await eventEntry.getTeam();
    const teamsOfClub = await Team.findAll({
      where: {
        clubId: team.clubId,
        season: team.season,
      },
      include: [{ model: Player, as: 'players' }, { model: EventEntry }],
    });

    const validation = await this.enrollmentService.fetchAndValidate(
      {
        teams: teamsOfClub.map((t) => ({
          id: t.id,
          name: t.name,
          type: t.type,
          link: t.link,
          teamNumber: t.teamNumber,
          basePlayers: t.entry?.meta?.competition?.players,
          players: t.players
            ?.filter(
              (p) =>
                p.TeamPlayerMembership.membershipType ===
                TeamMembershipType.REGULAR
            )
            .map((p) => p.id),
          backupPlayers: t.players
            ?.filter(
              (p) =>
                p.TeamPlayerMembership.membershipType ===
                TeamMembershipType.BACKUP
            )
            .map((p) => p.id),
          subEventId: t.entry?.subEventId,
        })),

        season: team.season,
      },
      EnrollmentValidationService.defaultValidators()
    );

    return validation.teams?.find((t) => t.id === team.id) ?? null;
  }

  @Mutation(() => Boolean)
  async finishEventEntry(
    @User() user: Player,
    @Args('clubId', { type: () => ID }) clubId: string,
    @Args('season', { type: () => Int }) season: number,
    @Args('email', { type: () => String }) email: string
  ) {
    if (!await user.hasAnyPermission([clubId + '_edit:club', 'edit-any:club'])) {
      throw new UnauthorizedException(
        `You do not have permission to enroll a club`
      );
    }

    await this.notificationService.notifyEnrollment(
      user.id,
      clubId,
      season,
      email
    );

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
    @Parent() eventEntryPlayer: EntryCompetitionPlayer
  ): Promise<Player | null> {
    return Player.findByPk(eventEntryPlayer.id);
  }
}
