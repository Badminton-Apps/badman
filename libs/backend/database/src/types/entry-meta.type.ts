import {
  Field,
  ID,
  InputType,
  Int,
  ObjectType,
  OmitType,
  PartialType,
} from '@nestjs/graphql';
import {
  EntryCompetition,
  EntryCompetitionPlayer,
  EntryTournament,
  Player,
} from '../models';

@ObjectType({ description: 'A Meta' })
export class EntryMetaType {
  @Field(() => EntryTournamentType, { nullable: true })
  tournament?: EntryTournament;

  @Field(() => EntryCompetitionType, { nullable: true })
  competition?: EntryCompetition;
}

@ObjectType({ description: 'A EntryTournament' })
export class EntryTournamentType {
  @Field(() => Int, { nullable: true })
  place?: number;
}

@ObjectType({ description: 'A EntryCompetition' })
export class EntryCompetitionType {
  @Field(() => Int, { nullable: true })
  teamIndex?: number;

  @Field(() => [EntryCompetitionPlayersType], { nullable: true })
  players?: EntryCompetitionPlayer[];
}

@ObjectType({ description: 'A EntryCompetitionPlayers' })
export class EntryCompetitionPlayersType {
  @Field(() => ID, { nullable: true })
  id?: string;

  @Field(() => Int, { nullable: true })
  single?: number;

  @Field(() => Int, { nullable: true })
  double?: number;

  @Field(() => Int, { nullable: true })
  mix?: number;

  @Field(() => String, { nullable: true })
  gender?: 'M' | 'F';

  @Field(() => Player, { nullable: true })
  player?: Player;

  @Field(() => Boolean, { nullable: true })
  levelException?: boolean;
}

// input type for EntryCmopetitionPlayer
@InputType()
export class EntryCompetitionPlayersInputType extends PartialType(
  OmitType(EntryCompetitionPlayersType, ['player'] as const),
  InputType
) {}
