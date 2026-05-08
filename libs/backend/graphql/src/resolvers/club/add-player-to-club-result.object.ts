import { Field, ID, ObjectType } from "@nestjs/graphql";

@ObjectType({
  description:
    "Result of addPlayerToClub. Idempotent on (clubId, playerId, start): when alreadyExisted is true, the player was already a member for that (club, player, start) combination and no write occurred. False when a fresh membership was created.",
})
export class AddPlayerToClubResult {
  @Field(() => ID)
  declare id: string;

  @Field(() => ID)
  declare clubId: string;

  @Field(() => ID)
  declare playerId: string;

  @Field(() => Date)
  declare start: Date;

  @Field(() => Date, { nullable: true })
  declare end: Date | null;

  @Field(() => String)
  declare membershipType: string;

  @Field(() => Boolean, {
    description:
      "True when an existing membership matched (clubId, playerId, start) and no write occurred. False when a fresh membership was created.",
  })
  declare alreadyExisted: boolean;
}
