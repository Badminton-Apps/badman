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
      let teamValid = true;
      if (baseIndex < subEvent?.minBaseIndex) {
        teamValid = false;
        errors.push({
          message: 'all.competition.team-enrollment.errors.team-to-strong',
          params: {
            baseIndex,
            minIndex: subEvent?.minBaseIndex,
            maxIndex: subEvent?.maxBaseIndex,
          },
        });
      }

      results.push({
        teamId: team.id,
        errors,
        valid: teamValid,
      });
    }

    return results;
  }
}
