import { ValidationRule } from '@badman/backend-validation';
import { ChangeEncounterValidationData, ChangeEncounterOutput } from '../../../models';



export abstract class Rule extends ValidationRule<ChangeEncounterValidationData, ChangeEncounterOutput> {}
