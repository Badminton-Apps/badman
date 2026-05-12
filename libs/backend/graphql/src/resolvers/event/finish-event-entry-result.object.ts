import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType({
  description:
    "Result of a single finishEventEntry mutation. Distinguishes three terminal outcomes: fresh finalisation succeeded ({success: true, alreadyFinalised: false, notificationDispatched: true}), fresh finalisation succeeded but notification failed ({success: true, alreadyFinalised: false, notificationDispatched: false}), already-finalised no-op ({success: true, alreadyFinalised: true, notificationDispatched: false}).",
})
export class FinishEventEntryResult {
  @Field(() => Boolean, {
    description:
      "Overall outcome. True whenever the resolver returns a value (i.e. did not throw). Reserved for forward-compat soft failures.",
  })
  declare success: boolean;

  @Field(() => Boolean, {
    description:
      "True when every EventEntry for (clubId, season) already had sendOn set and the call was a no-op apart from an optional Club.contactCompetition update.",
  })
  declare alreadyFinalised: boolean;

  @Field(() => Boolean, {
    description:
      "True when the post-commit notificationService.notifyEnrollment call succeeded. False when it threw, or when alreadyFinalised is true (no notification is attempted on the no-op path).",
  })
  declare notificationDispatched: boolean;
}
