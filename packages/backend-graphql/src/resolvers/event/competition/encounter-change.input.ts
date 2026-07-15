import { Field, ID, InputType } from "@nestjs/graphql";

@InputType()
export class ProposedDateInput {
  @Field(() => Date)
  date!: Date;

  @Field(() => ID, { nullable: true })
  locationId?: string;
}

@InputType()
export class ProposeEncounterChangeDatesInput {
  @Field(() => ID)
  encounterId!: string;

  @Field(() => [ProposedDateInput])
  dates!: ProposedDateInput[];
}

@InputType()
export class TriageEncounterChangeInput {
  @Field(() => ID)
  encounterChangeId!: string;

  @Field(() => [ID], { nullable: true })
  endorseIds?: string[];

  @Field(() => [ID], { nullable: true })
  rejectIds?: string[];

  @Field(() => [ProposedDateInput], { nullable: true })
  newDates?: ProposedDateInput[];
}

@InputType()
export class FinalizeEncounterChangeInput {
  @Field(() => ID)
  encounterChangeDateId!: string;
}
