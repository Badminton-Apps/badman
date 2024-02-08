import { EnrollmentValidationData, RuleResult } from '../../../models';
import { Rule } from './_rule.base';
export declare class TeamSubeventIndexRule extends Rule {
    validate(enrollment: EnrollmentValidationData): Promise<RuleResult[]>;
}
