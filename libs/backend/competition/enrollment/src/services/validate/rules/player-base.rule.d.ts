import { EnrollmentValidationData, RuleResult } from '../../../models';
import { Rule } from './_rule.base';
/**
 * Checks if a player is in the basePlayers array of 2 teams of the same type
 */
export declare class PlayerBaseRule extends Rule {
    validate(enrollment: EnrollmentValidationData): Promise<RuleResult[]>;
}
