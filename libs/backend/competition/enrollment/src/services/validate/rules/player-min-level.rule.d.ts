import { EnrollmentValidationData, RuleResult } from '../../../models';
import { Rule } from './_rule.base';
/**
 * Checks if the min level of the subEvent is not crossed
 */
export declare class PlayerMinLevelRule extends Rule {
    validate(enrollment: EnrollmentValidationData): Promise<RuleResult[]>;
}
