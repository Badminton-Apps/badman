import { Field, ID, ObjectType } from "@nestjs/graphql";

@ObjectType({
  description:
    "Result of a single createTeam mutation. Echoes the team and club identifiers and signals whether the team was newly created or already existed for the (link, season) pair (idempotent re-submit). When alreadyExisted is true, no writes happened; callers needing to update an existing team must use updateTeam.",
})
export class TeamResult {
  @Field(() => ID)
  declare teamId: string;

  @Field(() => ID)
  declare clubId: string;

  @Field(() => Boolean, {
    description:
      "True when an existing team was found for the (link, season) pair and no writes occurred. False when a fresh team was created.",
  })
  declare alreadyExisted: boolean;
}
