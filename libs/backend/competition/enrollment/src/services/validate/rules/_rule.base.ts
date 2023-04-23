import { EnrollmentValidationData, RuleResult } from '../../../models';

export abstract class Rule {
  abstract validate(
    enrollment: EnrollmentValidationData
  ): Promise<RuleResult[]>;
}
