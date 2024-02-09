import { EnrollmentValidationData, RuleResult } from '../../../models';
import { Rule } from './_rule.base';
/**
 * Checks if a player is part of the base of team A and plays in team B as team or backup player
 */
export declare class PlayerSubEventRule extends Rule {
    validate(enrollment: EnrollmentValidationData): Promise<RuleResult[]>;
}
