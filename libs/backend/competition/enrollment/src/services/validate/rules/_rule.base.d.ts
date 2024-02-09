import { EnrollmentValidationData, RuleResult } from '../../../models';
import { Logger } from '@nestjs/common';
export declare abstract class Rule {
    protected readonly logger: Logger;
    abstract validate(enrollment: EnrollmentValidationData): Promise<RuleResult[]>;
}
