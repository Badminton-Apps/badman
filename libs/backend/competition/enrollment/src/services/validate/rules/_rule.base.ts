import { EnrollmentValidationData, RuleResult } from '../../../models';
import { Logger } from '@nestjs/common';

export abstract class Rule {
  protected readonly logger = new Logger(Rule.name);

  abstract validate(enrollment: EnrollmentValidationData): Promise<RuleResult[]>;
}
