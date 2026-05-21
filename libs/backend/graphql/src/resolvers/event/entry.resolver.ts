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
import { TeamEnrollmentOutput } from "@badman/backend-enrollment";
import { NotificationService } from "@badman/backend-notifications";
import { ConfigType } from "@badman/utils";
import { Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Args, ID, Int, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import { Sequelize } from "sequelize-typescript";
import { ListArgs } from "../../utils";
import { EnrollmentFinalizeService } from "./enrollment-finalize.service";
import { EnrollmentValidationCacheService } from "./enrollment-validation-cache.service";
import { FinishEventEntryResult } from "./finish-event-entry-result.object";
import {
  StandingLoaderService,
  SubEventCompetitionLoaderService,
  TeamLoaderService,
} from "../../loaders";

@Resolver(() => EventEntry)
export class EventEntryResolver {
  private readonly logger = new Logger(EventEntryResolver.name);

  constructor(
    private notificationService: NotificationService,
    private enrollmentValidationCache: EnrollmentValidationCacheService,
    private enrollmentFinalizeService: EnrollmentFinalizeService,
    private _sequelize: Sequelize,
    private readonly subEventLoader: SubEventCompetitionLoaderService,
    private readonly teamLoader: TeamLoaderService,
    private readonly standingLoader: StandingLoaderService,
    private readonly configService: ConfigService<ConfigType>
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
    return this.teamLoader.load(eventEntry.teamId) as Promise<Team>;
  }

  @ResolveField(() => [Player])
  async players(@Parent() eventEntry: EventEntry): Promise<Player[]> {
    return eventEntry.getPlayers();
  }

  @ResolveField(() => SubEventCompetition, { nullable: true })
  async subEventCompetition(@Parent() eventEntry: EventEntry): Promise<SubEventCompetition> {
    return this.subEventLoader.load(eventEntry.subEventId) as Promise<SubEventCompetition>;
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
  async standing(@Parent() eventEntry: EventEntry): Promise<Standing | null> {
    return this.standingLoader.load(eventEntry.id);
  }

  @ResolveField(() => TeamEnrollmentOutput, {
    nullable: true,
    description:
      "Validate the enrollment. Defaults to null. Pass `validate: true` to compute — " +
      "this is a club-wide computation; only request it when you really need it. " +
      "**note**: the levels are the ones from may!",
  })
  async enrollmentValidation(
    @Parent() eventEntry: EventEntry,
    @Args("validate", { type: () => Boolean, nullable: true }) validate?: boolean
  ): Promise<TeamEnrollmentOutput | null> {
    // Explicit caller intent always wins (spec Clarifications Q1):
    //   validate === false  → always return null (even if kill-switch is on)
    //   validate === true   → always compute
    //   validate === undefined (omitted) → fall through to the rollout-safety env flag
    if (validate === false) return null;
    const effectiveValidate =
      validate === true ||
      this.configService.get<boolean>("ENROLLMENT_VALIDATION_DEFAULT_ENABLED") === true;
    if (!effectiveValidate) return null;
    const team = await this.teamLoader.load(eventEntry.teamId);
    if (!team) return null;
    return this.enrollmentValidationCache.getForTeam(team);
  }

  @Mutation(() => FinishEventEntryResult)
  async finishEventEntry(
    @User() user: Player,
    @Args("clubId", { type: () => ID }) clubId: string,
    @Args("season", { type: () => Int }) season: number,
    @Args("email", { type: () => String }) email: string
  ): Promise<FinishEventEntryResult> {
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
