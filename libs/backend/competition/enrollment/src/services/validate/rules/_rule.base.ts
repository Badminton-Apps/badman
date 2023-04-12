import { EnrollmentData, EnrollmentOutput } from '../../../models';

export abstract class Rule {
  abstract validate(enrollment: EnrollmentData): Promise<EnrollmentOutput>;
}
