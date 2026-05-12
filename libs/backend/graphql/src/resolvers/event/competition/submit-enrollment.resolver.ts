import { User } from "@badman/backend-authorization";
import { Player } from "@badman/backend-database";
import { NotificationService } from "@badman/backend-notifications";
import { Logger } from "@nestjs/common";
import { Args, Mutation, Resolver } from "@nestjs/graphql";
import { GraphQLError } from "graphql";
import { Sequelize } from "sequelize-typescript";
import { ErrorCode, assertUUID } from "../../../utils";
import { SubmitEnrollmentInput } from "./submit-enrollment.input";
import { SubmitEnrollmentResult } from "./submit-enrollment-result.object";
import { SubmitEnrollmentService } from "./submit-enrollment.service";

@Resolver()
export class SubmitEnrollmentResolver {
  private readonly logger = new Logger(SubmitEnrollmentResolver.name);

  constructor(
    private readonly submitEnrollmentService: SubmitEnrollmentService,
    private readonly notificationService: NotificationService,
    private readonly _sequelize: Sequelize
  ) {}

  @Mutation(() => SubmitEnrollmentResult)
  async submitEnrollment(
    @User() user: Player,
    @Args("input") input: SubmitEnrollmentInput
  ): Promise<SubmitEnrollmentResult> {
    const { clubId, season, adminEmail } = input;
    const userId = user?.id ?? null;

    try {
      assertUUID(clubId, "clubId", { userId });
    } catch (e) {
      this.logger.warn({ code: ErrorCode.BAD_USER_INPUT, field: "clubId", value: clubId, userId });
      throw e;
    }

    if (!(await user.hasAnyPermission([`${clubId}_edit:club`, "edit-any:club"]))) {
      throw new GraphQLError("Permission denied", {
        extensions: { code: ErrorCode.PERMISSION_DENIED, clubId },
      });
    }

    const confirmed = await user.hasAnyPermission(["change:transfer"]);
    const transaction = await this._sequelize.transaction();

    try {
      const result = await this.submitEnrollmentService.run({
        input,
        user,
        confirmed,
        transaction,
      });
      await transaction.commit();

      let notificationDispatched = false;
      if (!result.alreadyFinalised) {
        try {
          await this.notificationService.notifyEnrollment(user.id, clubId, season, adminEmail);
          notificationDispatched = true;
        } catch (notifyError) {
          this.logger.warn(
            `Failed to dispatch enrollment notification for club ${clubId} season ${season}`,
            notifyError
          );
        }
      }

      return {
        ok: true,
        alreadyFinalised: result.alreadyFinalised,
        notificationDispatched,
        teams: result.teams,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
