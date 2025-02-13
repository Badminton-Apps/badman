import { DrawCompetition, EncounterCompetition, Location, Team } from '@badman/backend-database';
import { Field, ID, InputType, ObjectType } from '@nestjs/graphql';
import { EncounterValidationError } from './encounter-validation-error.model';

@InputType()
export class EncounterValidationInput {
  @Field(() => [Suggestions], { nullable: true })
  suggestedDates?: Suggestions[];

  @Field(() => ID, { nullable: true })
  teamId?: string;

  @Field(() => ID, { nullable: true })
  clubId?: string;
}

@InputType()
export class updateEncounterCompetitionInput {
  @Field(() => Boolean, { nullable: true })
  gameLeaderPresent?: boolean;

  @Field(() => Boolean, { nullable: true })
  homeCaptainPresent?: boolean;

  @Field(() => Boolean, { nullable: true })
  awayCaptainPresent?: boolean;

  @Field(() => Boolean, { nullable: true })
  gameLeaderAccepted?: boolean;

  @Field(() => Boolean, { nullable: true })
  homeCaptainAccepted?: boolean;

  @Field(() => Boolean, { nullable: true })
  awayCaptainAccepted?: boolean;
}

@InputType()
export class Suggestions {
  @Field(() => Date)
  date!: Date;

  @Field(() => ID)
  locationId!: string;
}

@ObjectType()
export class EncounterValidationOutput {
  @Field(() => [EncounterValidationError], { nullable: 'itemsAndList' })
  errors?: EncounterValidationError<unknown>[];

  @Field(() => [EncounterValidationError], { nullable: 'itemsAndList' })
  warnings?: EncounterValidationError<unknown>[];

  @Field(() => Boolean, { nullable: true })
  valid?: boolean;

  @Field(() => [String], { nullable: 'itemsAndList' })
  validators?: string[];
}

export class EncounterValidationData {
  encounter!: EncounterCompetition;

  encountersSem1!: EncounterCompetition[];
  encountersSem2!: EncounterCompetition[];
  draw!: DrawCompetition;
  locations!: Location[];
  season!: number;
  semseter1!: boolean;
  index!: number;
  suggestedDates?: {
    date: Date;
    locationId: string;
  }[];
}
