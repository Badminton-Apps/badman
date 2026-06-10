import { Field, ID, ObjectType } from "@nestjs/graphql";

@ObjectType({
  description:
    "Result of a single createEnrollment mutation. Echoes the team and sub-event identifiers so callers that issue multiple submits can correlate responses, and signals whether the enrollment was newly created or already existed (idempotent re-submit).",
})
export class EnrollmentResult {
  @Field(() => ID)
  declare teamId: string;

  @Field(() => ID)
  declare subEventCompetitionId: string;

  @Field(() => Boolean, {
    description:
      "True when the team's existing entry already pointed to this sub-event before the call (idempotent no-op). False when a new enrollment was created or the entry was reassigned from another sub-event.",
  })
  declare alreadyExisted: boolean;
}
