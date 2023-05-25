import {
  Field,
  InputType,
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
  @Field({ nullable: true })
  place: number;
}

@ObjectType({ description: 'A EntryCompetition' })
export class EntryCompetitionType {
  @Field({ nullable: true })
  teamIndex: number;

  @Field(() => [EntryCompetitionPlayersType], { nullable: true })
  players: EntryCompetitionPlayer[];
}

@ObjectType({ description: 'A EntryCompetitionPlayers' })
export class EntryCompetitionPlayersType {
  @Field({ nullable: true })
  id: string;

  @Field({ nullable: true })
  single: number;

  @Field({ nullable: true })
  double: number;

  @Field({ nullable: true })
  mix: number;

  @Field({ nullable: true })
  gender: 'M' | 'F';

  @Field(() => Player, { nullable: true })
  player: Player;

  @Field({ nullable: true })
  levelException: boolean;
}

// input type for EntryCmopetitionPlayer
@InputType()
export class EntryCompetitionPlayersInputType extends PartialType(
  OmitType(EntryCompetitionPlayersType, ['player'] as const),
  InputType
) {}
