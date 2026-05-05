import { Team } from "@badman/backend-database";
import { SubEventTypeEnum } from "@badman/utils";
import { Field, ID, Int, ObjectType } from "@nestjs/graphql";

/**
 * The scope that was written by a single recalculateTeamNumbersForGroup call.
 * - For a single-type call, types is [type].
 * - For a pooled MX+NATIONAL call, types is [NATIONAL, MX].
 */
@ObjectType({
  description:
    "The scope that was written by a recalculateTeamNumbersForGroup call. " +
    "types contains [type] for single-tier calls and [NATIONAL, MX] for pooled calls.",
})
export class RecalculateAffectedScope {
  @Field(() => ID, { description: "The clubId whose teams were renumbered." })
  declare clubId: string;

  @Field(() => Int, { description: "The season whose teams were renumbered." })
  declare season: number;

  @Field(() => [SubEventTypeEnum], {
    description:
      "The SubEventTypes whose teams were renumbered. " +
      "[type] for single-tier; [NATIONAL, MX] for pooled.",
  })
  declare types: SubEventTypeEnum[];
}

/**
 * Returned by recalculateTeamNumbersForGroup.
 * teams: every team in the affected scope, in their final 1..N order.
 * affectedScope: which (clubId, season, types) were written.
 */
@ObjectType({
  description:
    "Result of a recalculateTeamNumbersForGroup mutation. " +
    "teams lists every team in the affected scope in final number order. " +
    "affectedScope identifies what was written so callers can refetch related views.",
})
export class RecalculateTeamNumbersResult {
  @Field(() => [Team], {
    description: "The teams in the affected scope, in their final 1..N order.",
  })
  declare teams: Team[];

  @Field(() => RecalculateAffectedScope, {
    description: "The scope this call wrote to.",
  })
  declare affectedScope: RecalculateAffectedScope;
}
