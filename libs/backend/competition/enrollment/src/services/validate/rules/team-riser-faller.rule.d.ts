import { EnrollmentValidationData, RuleResult } from '../../../models';
import { Rule } from './_rule.base';
/**
 * If a team was a riser or faller, it should be higher/lower then previous year
 */
export declare class TeamRiserFallerRule extends Rule {
    validate(enrollment: EnrollmentValidationData): Promise<RuleResult[]>;
}
