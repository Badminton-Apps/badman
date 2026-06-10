import { Field, ID, InputType } from "@nestjs/graphql";

@InputType({
  description:
    "Filter Club.players by associated ClubPlayerMembership fields. Supplying this argument (even as {}) opts the call into 'include unconfirmed memberships' behavior; omitting it preserves the legacy implicit confirmed=true filter.",
})
export class ClubMembershipFilterInput {
  @Field(() => [ID], {
    nullable: true,
    description:
      "Match memberships whose id is in this list (SQL IN). Empty array means 'no match'.",
  })
  id?: string[];

  @Field(() => [String], {
    nullable: true,
    description:
      "Match memberships whose membershipType is in this list (SQL IN). Allowed values: NORMAL, LOAN.",
  })
  membershipType?: string[];

  @Field(() => Date, {
    nullable: true,
    description: "Match memberships where start <= startBefore.",
  })
  startBefore?: Date;

  @Field(() => Date, {
    nullable: true,
    description:
      "Match memberships where end >= endAfter (NULL end excluded). To include open-ended memberships, the caller must run a separate query or accept the exclusion.",
  })
  endAfter?: Date;

  @Field(() => Boolean, {
    nullable: true,
    description:
      "Exact match on confirmed. Omit to include both confirmed and unconfirmed (when this argument is supplied at all).",
  })
  confirmed?: boolean;
}
