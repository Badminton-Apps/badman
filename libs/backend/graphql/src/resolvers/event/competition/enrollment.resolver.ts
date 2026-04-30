import { User } from "@badman/backend-authorization";
import {
  EventCompetition,
  EventEntry,
  Player,
  SubEventCompetition,
  Team,
} from "@badman/backend-database";
import {
  EnrollmentInput,
  EnrollmentOutput,
  EnrollmentValidationService,
} from "@badman/backend-enrollment";
import { Logger } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { GraphQLError } from "graphql";
import { Sequelize } from "sequelize-typescript";
import { ErrorCode } from "../../../utils";
import { EnrollmentResult } from "./enrollment-result.object";

@Resolver(() => EnrollmentOutput)
export class EnrollmentResolver {
  private readonly logger = new Logger(EnrollmentResolver.name);
  constructor(
    private enrollmentService: EnrollmentValidationService,
    private _sequelize: Sequelize
  ) {}

  @Query(() => EnrollmentOutput, {
    description: `Validate the enrollment\n\r**note**: the levels are the ones from may!`,
  })
  async enrollmentValidation(
    @Args("enrollment") enrollment: EnrollmentInput
  ): Promise<EnrollmentOutput> {
    return this.enrollmentService.fetchAndValidate(
      enrollment,
      EnrollmentValidationService.defaultValidators()
    );
  }

  @Mutation(() => EnrollmentResult, {
    description:
      "Enroll a single team into a single sub-event competition. Idempotent on (teamId, subEventId): re-submitting an already-enrolled pair returns success with alreadyExisted=true. Failures surface as GraphQLError with a stable extensions.code (PERMISSION_DENIED, TEAM_NOT_FOUND, SUB_EVENT_NOT_FOUND, SEASON_MISMATCH, INTERNAL_ERROR).",
  })
  async createEnrollment(
    @User() user: Player,
    @Args("teamId") teamId: string,
    @Args("subEventId") subEventId: string
  ): Promise<EnrollmentResult> {
    const userId = user?.id ?? null;

    const transaction = await this._sequelize.transaction();
    try {
      const team = await Team.findByPk(teamId, { transaction });
      if (!team) {
        this.logger.warn({
          code: ErrorCode.TEAM_NOT_FOUND,
          teamId,
          subEventCompetitionId: subEventId,
          userId,
        });
        throw new GraphQLError(`Team not found: ${teamId}`, {
          extensions: { code: ErrorCode.TEAM_NOT_FOUND, teamId },
        });
      }

      const allowed = await user.hasAnyPermission([
        "edit:competition",
        `${team.clubId}_edit:club`,
        "edit-any:club",
      ]);
      if (!allowed) {
        this.logger.warn({
          code: ErrorCode.PERMISSION_DENIED,
          teamId,
          subEventCompetitionId: subEventId,
          userId,
        });
        throw new GraphQLError("You do not have permission to enroll this team.", {
          extensions: { code: ErrorCode.PERMISSION_DENIED, userId },
        });
      }

      const subEvent = await SubEventCompetition.findByPk(subEventId, {
        transaction,
        include: [EventCompetition],
      });
      if (!subEvent) {
        this.logger.warn({
          code: ErrorCode.SUB_EVENT_NOT_FOUND,
          teamId,
          subEventCompetitionId: subEventId,
          userId,
        });
        throw new GraphQLError(`Sub-event not found: ${subEventId}`, {
          extensions: { code: ErrorCode.SUB_EVENT_NOT_FOUND, subEventId },
        });
      }

      const competitionSeason = subEvent.eventCompetition?.season;
      if (team.season !== competitionSeason) {
        this.logger.warn({
          code: ErrorCode.SEASON_MISMATCH,
          teamId,
          subEventCompetitionId: subEventId,
          userId,
          teamSeason: team.season,
          competitionSeason,
        });
        throw new GraphQLError("Team season does not match competition season.", {
          extensions: {
            code: ErrorCode.SEASON_MISMATCH,
            teamSeason: team.season,
            competitionSeason,
          },
        });
      }

      // Idempotency short-circuit: if the team's existing entry already points
      // to this sub-event, return success without further writes.
      const existingEntry = await team.getEntry({ transaction });
      if (existingEntry?.subEventId === subEventId) {
        await transaction.commit();
        return {
          teamId,
          subEventCompetitionId: subEventId,
          alreadyExisted: true,
        };
      }

      // Otherwise: reuse the team's existing entry (Team @HasOne EventEntry) or
      // create a fresh one, then attach to the requested sub-event. Cross-sub-event
      // moves are preserved as the existing behavior (see research.md §R3).
      const entry = existingEntry ?? (await EventEntry.create({}, { transaction }));
      await team.setEntry(entry, { transaction });
      await subEvent.addEventEntry(entry, { transaction });

      await transaction.commit();
      return {
        teamId,
        subEventCompetitionId: subEventId,
        alreadyExisted: false,
      };
    } catch (error) {
      await transaction.rollback();
      if (error instanceof GraphQLError) {
        // Already classified — let it pass through unchanged.
        throw error;
      }
      // Unclassified failure: log full stack server-side, return sanitized
      // INTERNAL_ERROR so internal details (SQL, stack frames) do not leak.
      this.logger.error(
        {
          code: ErrorCode.INTERNAL_ERROR,
          teamId,
          subEventCompetitionId: subEventId,
          userId,
        },
        error instanceof Error ? error.stack : String(error)
      );
      throw new GraphQLError("Internal error while creating enrollment.", {
        extensions: { code: ErrorCode.INTERNAL_ERROR },
      });
    }
  }
}
