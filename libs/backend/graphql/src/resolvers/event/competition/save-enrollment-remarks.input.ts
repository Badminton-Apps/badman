import { Field, ID, InputType, Int } from "@nestjs/graphql";

@InputType()
export class SaveEnrollmentRemarksInput {
  @Field(() => ID)
  clubId!: string;

  @Field(() => Int)
  season!: number;

  @Field(() => String)
  remarks!: string;

  @Field(() => String)
  adminEmail!: string;
}
