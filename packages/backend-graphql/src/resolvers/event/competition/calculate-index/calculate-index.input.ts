import { SubEventTypeEnum } from "@badman/utils";
import { Field, ID, InputType, Int } from "@nestjs/graphql";
@InputType()
export class CalculateIndexPlayerInput {
  @Field(() => ID)
  id!: string;
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
  season!: number;

  /**
   * Optional sub-event competition UUID.
   * Used only as a fallback to derive `type` and/or `season` when the caller
   * omits them. Does NOT influence the ranking-date cutoff — that is always
   * `<= June 10 of season` (validator's rule).
   */
  @Field(() => ID, { nullable: true })
  subEventCompetitionId?: string;

  @Field(() => [CalculateIndexPlayerInput])
  players!: CalculateIndexPlayerInput[];
}
