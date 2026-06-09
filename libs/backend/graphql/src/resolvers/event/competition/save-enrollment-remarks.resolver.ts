import { User } from "@badman/backend-authorization";
import { Club, EnrollmentRemark, Player } from "@badman/backend-database";
import { NotificationService } from "@badman/backend-notifications";
import { Logger } from "@nestjs/common";
import { Args, Mutation, Resolver } from "@nestjs/graphql";
import { GraphQLError } from "graphql";
import { Sequelize } from "sequelize-typescript";
import { ErrorCode, assertUUID } from "../../../utils";
import { SaveEnrollmentRemarksInput } from "./save-enrollment-remarks.input";

@Resolver()
export class SaveEnrollmentRemarksResolver {
  private readonly logger = new Logger(SaveEnrollmentRemarksResolver.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly _sequelize: Sequelize
  ) {}

  @Mutation(() => Boolean, {
    description:
      "Persist rescued enrollment remarks for a club. Requires an authenticated session. " +
      "Errors: PERMISSION_DENIED (unauthenticated), BAD_USER_INPUT (invalid clubId or empty remarks), CLUB_NOT_FOUND (unknown clubId).",
  })
  async saveEnrollmentRemarks(
    @User() user: Player,
    @Args("input") input: SaveEnrollmentRemarksInput
  ): Promise<boolean> {
    const { clubId, season, remarks, adminEmail } = input;

    // FR-006: require authenticated session
    if (!user?.id) {
      throw new GraphQLError("Permission denied", {
        extensions: { code: ErrorCode.PERMISSION_DENIED },
      });
    }

    // validate UUID
    try {
      assertUUID(clubId, "clubId", { userId: user.id });
    } catch (e) {
      this.logger.warn({
        code: ErrorCode.BAD_USER_INPUT,
        field: "clubId",
        value: clubId,
        userId: user.id,
      });
      throw e;
    }

    // validate remarks non-empty
    const trimmedRemarks = remarks?.trim() ?? "";
    if (trimmedRemarks.length === 0) {
      throw new GraphQLError("Remarks must not be empty or whitespace-only", {
        extensions: { code: ErrorCode.BAD_USER_INPUT, field: "remarks" },
      });
    }

    // verify club exists
    const club = await Club.findByPk(clubId);
    if (!club) {
      throw new GraphQLError(`Club not found: ${clubId}`, {
        extensions: { code: ErrorCode.CLUB_NOT_FOUND, clubId },
      });
    }

    const transaction = await this._sequelize.transaction();
    try {
      const record = await EnrollmentRemark.create(
        {
          clubId,
          season,
          remarks: trimmedRemarks,
          adminEmail: adminEmail ?? null,
          source: "rescue",
        },
        { transaction }
      );

      await transaction.commit();

      // fire-and-forget — never let notification failure affect the mutation result
      this.notificationService
        .notifyRescueRemarks(club, season, trimmedRemarks, record.createdAt as Date)
        .catch((e) =>
          this.logger.warn(
            `[saveEnrollmentRemarks] Failed to send rescue remarks notification for club ${clubId} season ${season}`,
            e
          )
        );

      return true;
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }
}
