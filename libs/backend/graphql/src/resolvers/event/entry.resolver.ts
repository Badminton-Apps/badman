import { User } from "@badman/backend-authorization";
import {
  Club,
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
} from "@badman/backend-database";
import { EnrollmentValidationService, TeamEnrollmentOutput } from "@badman/backend-enrollment";
import { NotificationService } from "@badman/backend-notifications";
import { TeamMembershipType } from "@badman/utils";
import { Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Args, ID, Int, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import { Sequelize } from "sequelize-typescript";
import { ErrorCode, ListArgs, assertUUID } from "../../utils";
import { GraphQLError } from "graphql";
import { EnrollmentFinalizeService } from "./enrollment-finalize.service";
import { FinishEventEntryResult } from "./finish-event-entry-result.object";

@Resolver(() => EventEntry)
export class EventEntryResolver {
  private readonly logger = new Logger(EventEntryResolver.name);

  constructor(
    private notificationService: NotificationService,
    private enrollmentService: EnrollmentValidationService,
    private enrollmentFinalizeService: EnrollmentFinalizeService,
    private _sequelize: Sequelize
  ) {}

  @Query(() => EventEntry)
  async eventEntry(@Args("id", { type: () => ID }) id: string): Promise<EventEntry> {
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

  @ResolveField(() => SubEventCompetition, { nullable: true })
  async subEventCompetition(@Parent() eventEntry: EventEntry): Promise<SubEventCompetition> {
    return eventEntry.getSubEventCompetition();
  }
  @ResolveField(() => DrawCompetition, { nullable: true })
  async drawCompetition(@Parent() eventEntry: EventEntry): Promise<DrawCompetition> {
    return eventEntry.getDrawCompetition();
  }

  @ResolveField(() => [DrawTournament])
  async drawTournament(@Parent() eventEntry: EventEntry): Promise<DrawTournament> {
    return eventEntry.getDrawTournament();
  }
  @ResolveField(() => [DrawTournament])
  async subEventTournament(@Parent() eventEntry: EventEntry): Promise<SubEventTournament> {
    return eventEntry.getSubEventTournament();
  }

  @ResolveField(() => Standing, { nullable: true })
  async standing(@Parent() eventEntry: EventEntry): Promise<Standing> {
    return eventEntry.getStanding();
  }

  @ResolveField(() => TeamEnrollmentOutput, {
    nullable: true,
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
      include: [{ model: Player, as: "players" }, { model: EventEntry }],
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
            ?.filter((p) => p.TeamPlayerMembership.membershipType === TeamMembershipType.REGULAR)
            .map((p) => p.id),
          backupPlayers: t.players
            ?.filter((p) => p.TeamPlayerMembership.membershipType === TeamMembershipType.BACKUP)
            .map((p) => p.id),
          subEventId: t.entry?.subEventId,
          clubId: t.clubId,
        })),
        clubId: team.clubId,
        season: team.season,
      },
      EnrollmentValidationService.defaultValidators()
    );

    return validation.teams?.find((t) => t.id === team.id) ?? null;
  }

  @Mutation(() => FinishEventEntryResult)
  async finishEventEntry(
    @User() user: Player,
    @Args("clubId", { type: () => ID }) clubId: string,
    @Args("season", { type: () => Int }) season: number,
    @Args("email", { type: () => String }) email: string
  ): Promise<FinishEventEntryResult> {
    const userId = user?.id ?? null;
    try {
      assertUUID(clubId, "clubId", { userId });
    } catch (e) {
      this.logger.warn({ code: ErrorCode.BAD_USER_INPUT, field: "clubId", value: clubId, userId });
      throw e;
    }

    if (!(await user.hasAnyPermission([clubId + "_edit:club", "edit-any:club"]))) {
      throw new UnauthorizedException(`You do not have permission to enroll a club`);
    }

    const club = await Club.findByPk(clubId);
    if (!club) {
      throw new NotFoundException(clubId);
    }

    const transaction = await this._sequelize.transaction();
    try {
      const { alreadyFinalised } = await this.enrollmentFinalizeService.finalize({
        clubId,
        season,
        email,
        user,
        club,
        transaction,
      });
      await transaction.commit();

      let notificationDispatched = false;
      if (!alreadyFinalised) {
        try {
          await this.notificationService.notifyEnrollment(user.id, clubId, season, email);
          notificationDispatched = true;
        } catch (notifyError) {
          this.logger.error(
            `Failed to dispatch enrollment notification for club ${clubId} season ${season}`,
            notifyError
          );
        }
      }

      return { success: true, alreadyFinalised, notificationDispatched };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
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
  async player(@Parent() eventEntryPlayer: EntryCompetitionPlayer): Promise<Player | null> {
    return Player.findByPk(eventEntryPlayer.id);
  }
}
