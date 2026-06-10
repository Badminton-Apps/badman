import { Field, ID, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class SubmitEnrollmentTeamResult {
  @Field(() => Int)
  inputIndex!: number;

  @Field(() => ID)
  teamId!: string;

  @Field(() => ID, { nullable: true })
  link?: string;

  @Field(() => Int)
  teamNumber!: number;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  abbreviation!: string;

  @Field(() => ID)
  entryId!: string;

  @Field(() => Boolean)
  alreadyExisted!: boolean;
}

@ObjectType()
export class SubmitEnrollmentResult {
  @Field(() => Boolean)
  ok!: boolean;

  @Field(() => Boolean)
  alreadyFinalised!: boolean;

  @Field(() => Boolean)
  notificationDispatched!: boolean;

  @Field(() => [SubmitEnrollmentTeamResult])
  teams!: SubmitEnrollmentTeamResult[];
}
