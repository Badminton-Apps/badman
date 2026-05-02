import { Field, ID, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class CalculateIndexContributingPlayer {
  @Field(() => ID)
  id!: string;

  /** "M" | "F" */
  @Field(() => String)
  gender!: string;

  @Field(() => Int)
  single!: number;

  @Field(() => Int)
  double!: number;

  @Field(() => Int)
  mix!: number;
}

@ObjectType()
export class CalculateIndexError {
  /**
   * One of: PLAYER_NOT_FOUND | RANKING_SYSTEM_NOT_FOUND | SUB_EVENT_NOT_FOUND
   *        | RANKING_FETCH_FAILED | INTERNAL_ERROR
   */
  @Field(() => String)
  code!: string;

  @Field(() => String)
  message!: string;

  /** Populated only when code === 'PLAYER_NOT_FOUND' */
  @Field(() => [ID], { nullable: true })
  playerIds?: string[];
}

@ObjectType()
export class CalculateIndexResult {
  /** Echoes the caller-supplied key for correlation */
  @Field(() => ID)
  key!: string;

  /** Null when error is set */
  @Field(() => Int, { nullable: true })
  index?: number;

  /** Empty when error is set */
  @Field(() => [CalculateIndexContributingPlayer], { nullable: true })
  contributingPlayers?: CalculateIndexContributingPlayer[];

  /** Null when error is set */
  @Field(() => Int, { nullable: true })
  missingPlayerCount?: number;

  /** Null when index is set */
  @Field(() => CalculateIndexError, { nullable: true })
  error?: CalculateIndexError;
}
