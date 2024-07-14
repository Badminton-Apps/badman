import { ChangeEncounterValidationData, ChangeEncounterOutput } from '../../../models';

export abstract class Rule {
  abstract validate(changeEncounter: ChangeEncounterValidationData): Promise<ChangeEncounterOutput>;
}
