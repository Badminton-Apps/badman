import { EnrollmentValidationData, EnrollmentOutput } from '../../../models';

export abstract class Rule {
  abstract validate(enrollment: EnrollmentValidationData): Promise<EnrollmentOutput>;
}
