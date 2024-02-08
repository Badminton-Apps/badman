import { EnrollmentValidationData, RuleResult } from '../../../models';
import { Rule } from './_rule.base';
/**
 * Checks if the players is the correct gender for the team
 */
export declare class PlayerGenderRule extends Rule {
    validate(enrollment: EnrollmentValidationData): Promise<RuleResult[]>;
    private _checkGender;
}
