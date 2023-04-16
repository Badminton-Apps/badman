import {
  Player,
  RankingSystem,
  SubEventCompetition,
  Team,
} from '@badman/backend-database';
import { InputType, Field, ID } from '@nestjs/graphql';

@InputType()
export class EnrollmentInput {
  @Field(() => ID)
  subEventId: string;

  @Field(() => ID)
  teamId: string;

  @Field(() => ID, { nullable: true })
  systemId: string;
}

export class EnrollmentData {
  teams: EnrollmentTeam[];
}

export class EnrollmentTeam {
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
