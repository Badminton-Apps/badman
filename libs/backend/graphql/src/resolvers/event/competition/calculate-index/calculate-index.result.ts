import { Field, ID, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class CalculateIndexContributingPlayer {
  @Field(() => ID)
  id!: string;

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
export class CalculateIndexResult {
  @Field(() => ID)
  key!: string;

  @Field(() => Int)
  index!: number;

  @Field(() => [CalculateIndexContributingPlayer])
  contributingPlayers!: CalculateIndexContributingPlayer[];

  @Field(() => Int)
  missingPlayerCount!: number;
}
