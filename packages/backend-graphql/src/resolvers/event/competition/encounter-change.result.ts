import { EncounterChange, EncounterCompetition } from "@badman/backend-database";
import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class ProposeEncounterChangeDatesResult {
  @Field(() => EncounterChange)
  encounterChange!: EncounterChange;
}

@ObjectType()
export class TriageEncounterChangeResult {
  @Field(() => EncounterChange)
  encounterChange!: EncounterChange;
}

@ObjectType()
export class FinalizeEncounterChangeResult {
  @Field(() => EncounterCompetition)
  encounter!: EncounterCompetition;

  @Field(() => EncounterChange)
  encounterChange!: EncounterChange;
}
