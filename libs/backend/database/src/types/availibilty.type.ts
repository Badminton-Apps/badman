import { Field, InputType, Int, ObjectType, OmitType, PartialType } from "@nestjs/graphql";

@ObjectType({ description: "A AvailiblyDay" })
export class AvailiblyDayType {
  @Field(() => String, { nullable: true })
  day?: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
  @Field(() => String, { nullable: true })
  startTime?: string;
  @Field(() => String, { nullable: true })
  endTime?: string;
  @Field(() => Int, { nullable: true })
  courts?: number;

  @Field(() => Date, { nullable: true })
  from?: Date;

  @Field(() => Date, { nullable: true })
  to?: Date;
}

@InputType()
export class AvailiblyDayInputType extends PartialType(
  OmitType(AvailiblyDayType, [] as const),
  InputType
) {}
