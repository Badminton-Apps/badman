import { Field, ID, InputType, Int } from "@nestjs/graphql";
import { SubEventTypeEnum } from "@badman/utils";

@InputType()
export class SubmitEnrollmentMembershipInput {
  @Field(() => ID)
  playerId!: string;

  @Field(() => Date)
  start!: Date;

  @Field(() => Date, { nullable: true })
  end?: Date;
}

@InputType()
export class SubmitEnrollmentTeamInput {
  @Field(() => ID, { nullable: true })
  link?: string;

  @Field(() => String)
  type!: SubEventTypeEnum;

  @Field(() => ID)
  subEventId!: string;

  @Field(() => Int)
  teamNumber!: number;

  @Field(() => ID, { nullable: true })
  captainId?: string;

  @Field(() => String, { nullable: true })
  email?: string;

  @Field(() => String, { nullable: true })
  phone?: string;

  @Field(() => String, { nullable: true })
  preferredDay?: string;

  @Field(() => String, { nullable: true })
  preferredTime?: string;

  @Field(() => ID, { nullable: true })
  preferredLocationId?: string;

  @Field(() => [ID])
  basePlayers!: string[];

  @Field(() => [ID])
  players!: string[];
}

@InputType()
export class SubmitEnrollmentInput {
  @Field(() => ID)
  clubId!: string;

  @Field(() => Int)
  season!: number;

  @Field(() => String)
  adminEmail!: string;

  @Field(() => String, { nullable: true })
  remarks?: string;

  @Field(() => [SubmitEnrollmentMembershipInput], { defaultValue: [] })
  loans: SubmitEnrollmentMembershipInput[] = [];

  @Field(() => [SubmitEnrollmentMembershipInput], { defaultValue: [] })
  transfers: SubmitEnrollmentMembershipInput[] = [];

  @Field(() => [SubmitEnrollmentTeamInput])
  teams!: SubmitEnrollmentTeamInput[];
}
