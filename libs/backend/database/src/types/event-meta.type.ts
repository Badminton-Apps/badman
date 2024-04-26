import { Field, InputType, Int, ObjectType, OmitType, PartialType } from '@nestjs/graphql';

@ObjectType({ description: 'A Meta' })
export class EventCompetitionMetaType {
  @Field(() => Int, { nullable: true })
  amountOfBasePlayers?: number;
}

// input type for EntryCmopetitionPlayer
@InputType()
export class EventCompetitionPlayersInputType extends PartialType(
  OmitType(EventCompetitionMetaType, [] as const),
  InputType,
) {}
