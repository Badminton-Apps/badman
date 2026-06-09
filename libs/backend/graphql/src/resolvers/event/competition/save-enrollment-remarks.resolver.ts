import { User } from "@badman/backend-authorization";
import { Club, EnrollmentRemark, Player } from "@badman/backend-database";
import { NotificationService } from "@badman/backend-notifications";
import { Logger } from "@nestjs/common";
import { Args, Mutation, Resolver } from "@nestjs/graphql";
import { GraphQLError } from "graphql";
import { Sequelize } from "sequelize-typescript";
import { ErrorCode, assertUUID } from "../../../utils";
import { SaveEnrollmentRemarksInput } from "./save-enrollment-remarks.input";

const REMARKS_MAX_LENGTH = 10_000;

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
      "Errors: PERMISSION_DENIED (unauthenticated), BAD_USER_INPUT (invalid clubId, empty remarks, or remarks too long), CLUB_NOT_FOUND (unknown clubId).",
  })
  async saveEnrollmentRemarks(
    @User() user: Player,
    @Args("input") input: SaveEnrollmentRemarksInput
  ): Promise<boolean> {
    const { clubId, season, remarks, adminEmail } = input;

    this.logger.log(
      `[saveEnrollmentRemarks] incoming — userId: ${user?.id ?? "anonymous"}, clubId: ${clubId}, season: ${season}, adminEmail: ${adminEmail ? "provided" : "absent"}`
    );

    // FR-006: require authenticated session
    if (!user?.id) {
      this.logger.warn(`[saveEnrollmentRemarks] rejected — unauthenticated`);
      throw new GraphQLError("Je moet ingelogd zijn om opmerkingen in te dienen.", {
        extensions: { code: ErrorCode.PERMISSION_DENIED },
      });
    }

    // validate clubId is a valid UUID
    try {
      assertUUID(clubId, "clubId", { userId: user.id });
    } catch (e) {
      this.logger.warn({
        msg: "[saveEnrollmentRemarks] rejected — invalid clubId UUID",
        code: ErrorCode.BAD_USER_INPUT,
        field: "clubId",
        value: clubId,
        userId: user.id,
      });
      throw e;
    }

    // validate remarks: non-empty, non-whitespace, within max length
    const trimmedRemarks = remarks?.trim() ?? "";
    if (trimmedRemarks.length === 0) {
      this.logger.warn(
        `[saveEnrollmentRemarks] rejected — empty remarks, userId: ${user.id}, clubId: ${clubId}`
      );
      throw new GraphQLError("Opmerkingen mogen niet leeg of enkel uit spaties bestaan.", {
        extensions: { code: ErrorCode.BAD_USER_INPUT, field: "remarks" },
      });
    }
    if (trimmedRemarks.length > REMARKS_MAX_LENGTH) {
      this.logger.warn(
        `[saveEnrollmentRemarks] rejected — remarks too long (${trimmedRemarks.length} chars), userId: ${user.id}, clubId: ${clubId}`
      );
      throw new GraphQLError(
        `Opmerkingen mogen maximaal ${REMARKS_MAX_LENGTH} tekens bevatten (ingediend: ${trimmedRemarks.length}).`,
        {
          extensions: {
            code: ErrorCode.BAD_USER_INPUT,
            field: "remarks",
            maxLength: REMARKS_MAX_LENGTH,
            actualLength: trimmedRemarks.length,
          },
        }
      );
    }

    // normalize adminEmail: treat empty string as absent
    const normalizedEmail = adminEmail?.trim() || null;

    // verify club exists
    this.logger.log(`[saveEnrollmentRemarks] looking up club ${clubId}`);
    const club = await Club.findByPk(clubId);
    if (!club) {
      this.logger.warn(
        `[saveEnrollmentRemarks] rejected — club not found, clubId: ${clubId}, userId: ${user.id}`
      );
      throw new GraphQLError(`Club niet gevonden (id: ${clubId}).`, {
        extensions: { code: ErrorCode.CLUB_NOT_FOUND, clubId },
      });
    }
    this.logger.log(`[saveEnrollmentRemarks] club found — "${club.name}" (${clubId})`);

    const transaction = await this._sequelize.transaction();
    try {
      this.logger.log(
        `[saveEnrollmentRemarks] inserting record — clubId: ${clubId}, season: ${season}, remarksLength: ${trimmedRemarks.length}, adminEmail: ${normalizedEmail ?? "null"}`
      );

      const record = await EnrollmentRemark.create(
        {
          clubId,
          season,
          remarks: trimmedRemarks,
          adminEmail: normalizedEmail,
          source: "rescue",
        },
        { transaction }
      );

      await transaction.commit();
      this.logger.log(
        `[saveEnrollmentRemarks] committed — recordId: ${record.id}, clubId: ${clubId}, season: ${season}`
      );

      // fire-and-forget — never let notification failure roll back the DB write
      this.notificationService
        .notifyRescueRemarks(club, season, trimmedRemarks, record.createdAt as Date)
        .then(() =>
          this.logger.log(
            `[saveEnrollmentRemarks] notification dispatched — recordId: ${record.id}, clubId: ${clubId}`
          )
        )
        .catch((e) =>
          this.logger.warn(
            `[saveEnrollmentRemarks] notification FAILED (record was saved) — recordId: ${record.id}, clubId: ${clubId}, season: ${season}`,
            e
          )
        );

      return true;
    } catch (e) {
      await transaction.rollback();
      this.logger.error(
        `[saveEnrollmentRemarks] DB error, rolled back — clubId: ${clubId}, season: ${season}, userId: ${user.id}`,
        e
      );
      throw e;
    }
  }
}
