import {
  EntryCompetitionPlayers,
  PlayerRankingType,
  Player,
} from '@badman/backend-database';
import { ObjectType, Field, Int } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';

@ObjectType()
export class ValidationError {
  @Field({ nullable: true })
  message: string;

  @Field(() => GraphQLJSONObject, { nullable: true })
  params?: unknown;
}

@ObjectType()
export class AssemblyOutput {
  @Field(() => [ValidationError], { nullable: 'itemsAndList' })
  errors?: ValidationError[];

  @Field(() => Boolean, { nullable: true })
  valid: boolean;

  @Field(() => Int, { nullable: true })
  baseTeamIndex?: number;

  @Field(() => Int, { nullable: true })
  teamIndex?: number;

  @Field(() => [PlayerRankingType], { nullable: 'itemsAndList' })
  baseTeamPlayers?: PlayerRankingType[];

  @Field(() => [PlayerRankingType], { nullable: 'itemsAndList' })
  teamPlayers?: PlayerRankingType[];

  baseTeamPlayersData?: Player[];
  teamPlayersData?: EntryCompetitionPlayers[];
}
