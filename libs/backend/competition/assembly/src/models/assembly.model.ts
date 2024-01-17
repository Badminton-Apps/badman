import {
  DrawCompetition,
  EncounterCompetition,
  EntryCompetitionPlayer,
  EventCompetition,
  Meta,
  Player,
  PlayerRankingType,
  RankingSystem,
  SubEventCompetition,
  Team,
} from '@badman/backend-database';
import { SubEventTypeEnum } from '@badman/utils';
import { Field, ID, InputType, Int, ObjectType } from '@nestjs/graphql';
import { AssemblyValidationError } from './error.model';

@InputType()
export class AssemblyInput {
  @Field(() => ID, { nullable: true })
  encounterId?: string;

  @Field(() => ID)
  teamId!: string;

  @Field(() => ID, { nullable: true })
  systemId?: string;

  @Field(() => ID, { nullable: true })
  captainId?: string;

  @Field(() => ID, { nullable: true })
  single1?: string;

  @Field(() => ID, { nullable: true })
  single2?: string;

  @Field(() => ID, { nullable: true })
  single3?: string;

  @Field(() => ID, { nullable: true })
  single4?: string;

  @Field(() => [ID], { nullable: 'itemsAndList' })
  double1?: string[];

  @Field(() => [ID], { nullable: 'itemsAndList' })
  double2?: string[];

  @Field(() => [ID], { nullable: 'itemsAndList' })
  double3?: string[];

  @Field(() => [ID], { nullable: 'itemsAndList' })
  double4?: string[];

  @Field(() => [ID], { nullable: 'itemsAndList' })
  subtitudes?: string[];

  @Field(() => String, { nullable: true })
  description?: string;
}

@ObjectType()
export class AssemblyOutput {
  @Field(() => [AssemblyValidationError], { nullable: 'itemsAndList' })
  errors?: AssemblyValidationError<unknown>[];

  @Field(() => [AssemblyValidationError], { nullable: 'itemsAndList' })
  warnings?: AssemblyValidationError<unknown>[];

  @Field(() => Boolean, { nullable: true })
  valid?: boolean;

  @Field(() => Int, { nullable: true })
  baseTeamIndex?: number;

  @Field(() => Int, { nullable: true })
  titularsIndex?: number;

  @Field(() => [PlayerRankingType], { nullable: 'itemsAndList' })
  baseTeamPlayers?: PlayerRankingType[];

  @Field(() => [PlayerRankingType], { nullable: 'itemsAndList' })
  titularsPlayers?: PlayerRankingType[];

  systemId?: string;
  titularsPlayerData?: Player[];
  basePlayersData?: EntryCompetitionPlayer[];
}

export class AssemblyValidationData {
  type?: SubEventTypeEnum;
  meta?: Meta;
  otherMeta?: Meta[];
  team?: Team;

  teamIndex?: number;
  teamPlayers?: Player[];

  encounter?: EncounterCompetition;
  draw?: DrawCompetition;
  subEvent?: SubEventCompetition;
  event?: EventCompetition;

  single1?: Player;
  single2?: Player;
  single3?: Player;
  single4?: Player;
  double1?: [Player, Player];
  double2?: [Player, Player];
  double3?: [Player, Player];
  double4?: [Player, Player];
  subtitudes?: Player[];
  system?: RankingSystem;
}
