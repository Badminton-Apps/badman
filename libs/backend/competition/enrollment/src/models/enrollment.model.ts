import {
  Player,
  RankingSystem,
  SubEventCompetition,
  Team,
} from '@badman/backend-database';
import { Field, ID, InputType, Int, ObjectType } from '@nestjs/graphql';
import { EnrollmentValidationError, TeamValidity } from './error.model';

@InputType()
export class EnrollmentInput {
  @Field(() => [EnrollmentInputTeam], { nullable: true })
  teams: EnrollmentInputTeam[];

  @Field(() => ID, { nullable: true })
  systemId?: string;
}

@InputType()
export class EnrollmentInputTeam {
  @Field(() => ID, { nullable: true })
  id?: string;

  @Field(() => ID, { nullable: true })
  linkId?: string;

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
  @Field(() => [EnrollmentValidationError], { nullable: 'itemsAndList' })
  errors?: EnrollmentValidationError[];

  @Field(() => [EnrollmentValidationError], { nullable: 'itemsAndList' })
  warnings?: EnrollmentValidationError[];

  @Field(() => [TeamValidity], { nullable: true })
  valid?: {
    teamId: string;
    valid: boolean;
  }[];

  @Field(() => [TeamEnrollmentOutput], { nullable: true })
  teams?: TeamEnrollmentOutput[];
}

// Team outut info
@ObjectType()
export class TeamEnrollmentOutput {
  @Field(() => ID)
  id: string;

  @Field(() => ID, { nullable: true })
  linkId?: string;

  @Field(() => Int, { nullable: true })
  teamIndex?: number;

  @Field(() => Int, { nullable: true })
  baseIndex?: number;

  @Field(() => Boolean)
  isNewTeam: boolean;

  @Field(() => Boolean)
  possibleOldTeam: boolean;

  @Field(() => Int, { nullable: true })
  maxLevel?: number;

  @Field(() => Int, { nullable: true })
  minBaseIndex?: number;

  @Field(() => Int, { nullable: true })
  maxBaseIndex?: number;
}

//  validation data
export class EnrollmentValidationData {
  teams: EnrollmentValidationTeam[];
}

export class EnrollmentValidationTeam {
  team: Partial<Team>;
  previousSeasonTeam: Partial<Team>;

  teamIndex: number;
  teamPlayers: Player[];
  backupPlayers: Player[];

  baseIndex: number;
  basePlayers: Player[];

  subEvent: SubEventCompetition;
  system: RankingSystem;
}
