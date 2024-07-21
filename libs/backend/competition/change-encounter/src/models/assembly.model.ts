import { DrawCompetition, EncounterCompetition, Location, Team } from '@badman/backend-database';
import { Field, ID, InputType, ObjectType } from '@nestjs/graphql';
import { ChangeEncounterValidationError } from './error.model';

@InputType()
export class ChangeEncounterInput {
  @Field(() => ID)
  teamId!: string;

  @Field(() => ID, { nullable: true })
  workingencounterId?: string;

  @Field(() => [Date], { nullable: true })
  suggestedDates?: Date[];
}

@ObjectType()
export class ChangeEncounterOutput {
  @Field(() => [ChangeEncounterValidationError], { nullable: 'itemsAndList' })
  errors?: ChangeEncounterValidationError<unknown>[];

  @Field(() => [ChangeEncounterValidationError], { nullable: 'itemsAndList' })
  warnings?: ChangeEncounterValidationError<unknown>[];

  @Field(() => Boolean, { nullable: true })
  valid?: boolean;
}

export class ChangeEncounterValidationData {
  team!: Team;

  encountersSem1!: EncounterCompetition[];
  encountersSem2!: EncounterCompetition[];
  draw!: DrawCompetition;
  locations!: Location[];
  lowestYear!: number;
  workingencounterId?: string;
  suggestedDates?: Date[];
}
