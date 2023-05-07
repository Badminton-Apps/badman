import {
  EnrollmentValidationData,
  RuleResult,
  EnrollmentValidationError,
} from '../../../models';
import { Rule } from './_rule.base';

export class TeamSubeventIndexRule extends Rule {
  async validate(enrollment: EnrollmentValidationData) {
    const results = [] as RuleResult[];

    for (const { baseIndex, subEvent, team } of enrollment.teams) {
      const errors = [] as EnrollmentValidationError[];
      const warnings = [] as EnrollmentValidationError[];
      if (baseIndex < subEvent?.minBaseIndex) {
        errors.push({
          message: 'all.competition.team-enrollment.errors.team-to-strong',
          params: {
            baseIndex,
            minIndex: subEvent?.minBaseIndex,
          },
        });
      }

      if (baseIndex > subEvent?.maxBaseIndex) {
        errors.push({
          message: 'all.competition.team-enrollment.errors.team-to-week',
          params: {
            baseIndex,
            maxIndex: subEvent?.maxBaseIndex,
          },
        });
      }

      results.push({
        teamId: team.id,
        errors,
        warnings,
        valid: errors.length === 0,
      });
    }

    return results;
  }
}
