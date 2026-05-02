import { SubEventTypeEnum } from "@badman/utils";
import { Field, ID, InputType, Int } from "@nestjs/graphql";
import { IsInt, IsOptional, IsUUID, Min } from "class-validator";

@InputType()
export class CalculateIndexPlayerInput {
  @Field(() => ID)
  @IsUUID()
  id!: string;

  /** "M" | "F"; optional — when absent, resolved from the Player table */
  @Field(() => String, { nullable: true })
  @IsOptional()
  gender?: string;
}

@InputType()
export class CalculateIndexInput {
  /** Caller-supplied correlation key — typically the team UUID */
  @Field(() => ID)
  key!: string;

  /** Team type: M | F | MX | NATIONAL */
  @Field(() => String)
  type!: SubEventTypeEnum;

  @Field(() => Int)
  @IsInt()
  @Min(1990)
  season!: number;

  /**
   * Optional sub-event competition UUID.
   * When present, the service derives the ranking snapshot window from the linked
   * EventCompetition (parity with the entry-model hook).
   */
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  subEventCompetitionId?: string;

  @Field(() => [CalculateIndexPlayerInput])
  players!: CalculateIndexPlayerInput[];
}
