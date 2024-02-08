import { EnrollmentValidationData, RuleResult } from '../../../models';
import { Rule } from './_rule.base';
/**
 * Checks if all players have the competition status active
 */
export declare class PlayerCompStatusRule extends Rule {
    validate(enrollment: EnrollmentValidationData): Promise<RuleResult[]>;
}
