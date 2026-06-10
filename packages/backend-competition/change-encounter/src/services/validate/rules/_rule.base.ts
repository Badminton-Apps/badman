import { ValidationRule } from "@badman/backend-validation";
import { EncounterValidationData, EncounterValidationOutput } from "../../../models";

export abstract class Rule extends ValidationRule<
  EncounterValidationData,
  EncounterValidationOutput
> {}
