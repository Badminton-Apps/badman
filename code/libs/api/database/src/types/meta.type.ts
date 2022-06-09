import {
  EntryCompetition,
  EntryCompetitionPlayers,
  EntryTournament,
  Player,
} from '@badman/api/database';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'A Meta' })
export class MetaType {
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
  players: EntryCompetitionPlayers[];
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
  gender: string;

  @Field(() => Player, { nullable: true })
  player: Player;
}
