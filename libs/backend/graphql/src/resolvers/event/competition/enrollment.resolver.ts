import { User } from "@badman/backend-authorization";
import { Player } from "@badman/backend-database";
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
import { EnrollmentEntryService } from "./enrollment-entry.service";
import { EnrollmentResult } from "./enrollment-result.object";

@Resolver(() => EnrollmentOutput)
export class EnrollmentResolver {
  private readonly logger = new Logger(EnrollmentResolver.name);
  constructor(
    private enrollmentService: EnrollmentValidationService,
    private enrollmentEntryService: EnrollmentEntryService,
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
      const result = await this.enrollmentEntryService.createEntry({
        teamId,
        subEventId,
        transaction,
        user,
      });
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      if (error instanceof GraphQLError) throw error;
      this.logger.error(
        { code: ErrorCode.INTERNAL_ERROR, teamId, subEventCompetitionId: subEventId, userId },
        error instanceof Error ? error.stack : String(error)
      );
      throw new GraphQLError("Internal error while creating enrollment.", {
        extensions: { code: ErrorCode.INTERNAL_ERROR },
      });
    }
  }
}
