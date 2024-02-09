import {
  EntryCompetitionPlayer,
  PlayerUpdateInput,
  RankingSystem,
  SubEventCompetition,
  Team,
} from '@badman/backend-database';
import {
  Field,
  ID,
  InputType,
  Int,
  ObjectType,
  OmitType,
  PartialType,
  PickType,
} from '@nestjs/graphql';
import { EnrollmentValidationError } from './error.model';

@InputType()
export class EnrollmentInput {
  @Field(() => [EnrollmentInputTeam], { nullable: true })
  teams?: EnrollmentInputTeam[];

  @Field(() => ID, { nullable: true })
  systemId?: string;

  @Field(() => Int, { nullable: true })
  season?: number;
}

@InputType()
export class EnrollmentInputTeam extends PartialType(
  PickType(Team, ['id', 'name', 'type', 'link', 'teamNumber'] as const),
  InputType
) {
  @Field(() => [ID], { nullable: true })
  basePlayers?: string[];

  @Field(() => [ID], { nullable: true })
  players?: string[];

  @Field(() => [ID], { nullable: true })
  backupPlayers?: string[];

  @Field(() => ID, { nullable: true })
  subEventId?: string;
}

@ObjectType()
export class EnrollmentOutput {
  @Field(() => [TeamEnrollmentOutput], { nullable: true })
  teams?: TeamEnrollmentOutput[];
}

@ObjectType()
export class PlayerRankingType extends PartialType(
  OmitType(PlayerUpdateInput, ['sub', 'permissions'] as const),
  ObjectType
) {
  @Field(() => Number)
  single?: number;

  @Field(() => Number)
  double?: number;

  @Field(() => Number)
  mix?: number;
}

// Team outut info
@ObjectType()
export class TeamEnrollmentOutput {
  @Field(() => ID)
  id!: string;

  @Field(() => ID, { nullable: true })
  linkId?: string;

  @Field(() => Int, { nullable: true })
  teamIndex?: number;

  @Field(() => Int, { nullable: true })
  baseIndex?: number;

  @Field(() => Boolean)
  isNewTeam?: boolean;

  @Field(() => Boolean)
  possibleOldTeam?: boolean;

  @Field(() => Int, { nullable: true })
  maxLevel?: number;

  @Field(() => Int, { nullable: true })
  minBaseIndex?: number;

  @Field(() => Int, { nullable: true })
  maxBaseIndex?: number;

  @Field(() => [EnrollmentValidationError], { nullable: 'itemsAndList' })
  errors?: EnrollmentValidationError[];

  @Field(() => [EnrollmentValidationError], { nullable: 'itemsAndList' })
  warnings?: EnrollmentValidationError[];

  @Field(() => Boolean)
  valid?: boolean;
}

export type RuleResult = {
  teamId: string;
  warnings?: EnrollmentValidationError[];
  errors?: EnrollmentValidationError[];
  valid: boolean;
};

//  validation data
export class EnrollmentValidationData {
  teams!: EnrollmentValidationTeam[];
}

export class EnrollmentValidationTeam {
  team?: Partial<Team>;
  previousSeasonTeam?: Partial<Team>;

  isNewTeam?: boolean;
  possibleOldTeam?: boolean;

  teamIndex?: number;
  teamPlayers?: EntryCompetitionPlayer[];
  backupPlayers?: EntryCompetitionPlayer[];

  baseIndex?: number;
  basePlayers?: EntryCompetitionPlayer[];

  subEvent?: SubEventCompetition;
  system?: RankingSystem;
}
