import { User } from "@badman/backend-authorization";
import { Club, Player } from "@badman/backend-database";
import { SubEventTypeEnum } from "@badman/utils";
import { Logger } from "@nestjs/common";
import { Args, ID, Int, Mutation, Resolver } from "@nestjs/graphql";
import { GraphQLError } from "graphql";
import { Sequelize } from "sequelize-typescript";
import { ErrorCode, assertUUID } from "../../utils";
import { RecalculateTeamNumbersResult } from "./team-renumber-result.object";
import { TeamRenumberingService } from "./team-renumbering.service";

@Resolver()
export class TeamRenumberResolver {
  private readonly logger = new Logger(TeamRenumberResolver.name);

  constructor(
    private readonly _sequelize: Sequelize,
    private readonly _renumber: TeamRenumberingService
  ) {}

  @Mutation(() => RecalculateTeamNumbersResult, {
    description:
      "Recompute teamNumber / name / abbreviation for every team in the affected scope. " +
      "When nationalCountsAsMixed is true and type is MX, the scope is the pooled NATIONAL+MX set " +
      "for that (clubId, season): NATIONAL teams take slots 1..K (sorted by baseIndex), MX teams " +
      "take K+1..K+M (sorted by baseIndex). This mutation is the only path that writes those three " +
      "fields. Mid-season callers MUST NOT call it; team numbers are intended to be frozen for the " +
      "season once enrollment closes.",
  })
  async recalculateTeamNumbersForGroup(
    @Args("clubId", { type: () => ID }) clubId: string,
    @Args("season", { type: () => Int }) season: number,
    @Args("type", { type: () => SubEventTypeEnum }) type: SubEventTypeEnum,
    @Args("nationalCountsAsMixed", { type: () => Boolean, defaultValue: false })
    nationalCountsAsMixed: boolean,
    @User() user: Player
  ): Promise<RecalculateTeamNumbersResult> {
    const userId = user?.id ?? null;
    this.logger.log({
      message: "recalculateTeamNumbersForGroup start",
      clubId,
      season,
      type,
      nationalCountsAsMixed,
      userId,
    });

    // UUID validation BEFORE authorization, transaction, or advisory lock
    try {
      assertUUID(clubId, "clubId", { userId });
    } catch (e) {
      this.logger.warn({ code: ErrorCode.BAD_USER_INPUT, field: "clubId", value: clubId, userId });
      throw e;
    }

    // Authorization check BEFORE opening the transaction or acquiring the lock
    if (!(await user.hasAnyPermission([`${clubId}_edit:club`, "edit-any:club"]))) {
      this.logger.warn({ code: ErrorCode.PERMISSION_DENIED, clubId, userId });
      throw new GraphQLError(
        "You do not have permission to recalculate team numbers for this club.",
        {
          extensions: { code: ErrorCode.PERMISSION_DENIED, userId, clubId },
        }
      );
    }

    const transaction = await this._sequelize.transaction();
    try {
      // Look up the club (validates clubId)
      const club = await Club.findByPk(clubId, { transaction });
      if (!club) {
        this.logger.warn({ code: ErrorCode.CLUB_NOT_FOUND, clubId, userId });
        throw new GraphQLError(`Club not found: ${clubId}`, {
          extensions: { code: ErrorCode.CLUB_NOT_FOUND, clubId },
        });
      }

      // Derive the scope (FR-002 rules)
      const types = deriveScope(type, nationalCountsAsMixed);

      // Delegate to the service — it acquires the advisory lock and does the writes
      const renumbered = await this._renumber.recalculateForScope({
        clubId,
        season,
        types,
        transaction,
      });

      await transaction.commit();

      const teams = renumbered.map((r) => r.team);
      const changedCount = renumbered.filter((r) => r.changed).length;
      this.logger.debug({
        message: "recalculateTeamNumbersForGroup done",
        teamsChanged: changedCount,
      });

      return {
        teams,
        affectedScope: { clubId, season, types },
      };
    } catch (e) {
      await transaction.rollback();
      if (e instanceof GraphQLError) {
        throw e;
      }
      const msg = e instanceof Error ? e.stack : String(e);
      this.logger.error({ code: ErrorCode.INTERNAL_ERROR, clubId, userId }, msg);
      throw new GraphQLError("Internal error during team number recalculation.", {
        extensions: { code: ErrorCode.INTERNAL_ERROR },
      });
    }
  }
}

/**
 * Derives the ordered list of SubEventTypes to include in the recalculate scope.
 * Per spec FR-002 / contracts/team-renumber-mutation.md §"Behavior (success)" step 4.
 *
 * type ∈ { M, F }                          → [type]
 * type = NATIONAL                           → [NATIONAL]
 * type = MX, nationalCountsAsMixed = false  → [MX]
 * type = MX, nationalCountsAsMixed = true   → [NATIONAL, MX]  (NATIONAL first)
 */
function deriveScope(type: SubEventTypeEnum, nationalCountsAsMixed: boolean): SubEventTypeEnum[] {
  if (type === SubEventTypeEnum.MX && nationalCountsAsMixed) {
    return [SubEventTypeEnum.NATIONAL, SubEventTypeEnum.MX];
  }
  return [type];
}
