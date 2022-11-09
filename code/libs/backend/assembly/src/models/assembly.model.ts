import {
  DrawCompetition,
  EncounterCompetition,
  EventCompetition,
  Meta,
  Player, RankingSystem,
  SubEventCompetition,
  SubEventType,
  Team
} from '@badman/backend-database';
import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class AssemblyInput {
  @Field(() => ID)
  encounterId: string;

  @Field(() => ID)
  teamId: string;

  @Field(() => ID, { nullable: true })
  systemId: string;

  @Field(() => ID, { nullable: true })
  captainId: string;

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
  subtitudes: string[];
}

export class AssemblyData {
  type: SubEventType;
  meta: Meta;
  otherMeta: Meta[];
  team: Team;

  teamIndex: number;
  teamPlayers: Player[];

  encounter: EncounterCompetition;
  draw: DrawCompetition;
  subEvent: SubEventCompetition;
  event: EventCompetition;

  single1?: Player;
  single2?: Player;
  single3?: Player;
  single4?: Player;
  double1?: [Player, Player];
  double2?: [Player, Player];
  double3?: [Player, Player];
  double4?: [Player, Player];
  subtitudes?: Player[];
  system: RankingSystem;
}
