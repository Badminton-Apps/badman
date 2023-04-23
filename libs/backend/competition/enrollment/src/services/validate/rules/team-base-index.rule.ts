import {
  EnrollmentValidationData,
  RuleResult,
  EnrollmentValidationError,
} from '../../../models';
import { Rule } from './_rule.base';

export class TeamBaseIndexRule extends Rule {
  async validate(enrollment: EnrollmentValidationData) {
    const results = [] as RuleResult[];

    for (const { team, teamIndex, baseIndex } of enrollment.teams) {
      const errors = [] as EnrollmentValidationError[];
      let teamValid = true;
      if (team?.teamNumber != 1 && teamIndex < baseIndex) {
        teamValid = false;
        errors.push({
          message: 'all.competition.team-enrollment.errors.team-index',
          params: {
            teamIndex,
            baseIndex: baseIndex,
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
