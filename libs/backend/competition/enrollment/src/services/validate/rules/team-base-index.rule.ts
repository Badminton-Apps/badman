import {
  EnrollmentValidationData,
  RuleResult,
  EnrollmentValidationError,
} from '../../../models';
import { Rule } from './_rule.base';

export class TeamBaseIndexRule extends Rule {
  async validate(enrollment: EnrollmentValidationData) {
    const results = [] as RuleResult[];

    for (const {
      team,
      teamIndex,
      baseIndex,
      previousSeasonTeam,
    } of enrollment.teams) {
      const errors = [] as EnrollmentValidationError[];
      const warning = [] as EnrollmentValidationError[];
      let teamValid = true;
      if (team?.teamNumber != 1 && teamIndex < baseIndex) {
        teamValid = true;
        warning.push({
          message: 'all.competition.team-enrollment.errors.team-index',
          params: {
            teamIndex,
            baseIndex,
          },
        });
      }

      if (
        team?.teamNumber == 1 &&
        previousSeasonTeam?.entry?.standing?.faller &&
        teamIndex < baseIndex
      ) {
        teamValid = false;
        errors.push({
          message: 'all.competition.team-enrollment.errors.first-team-index',
        });
      }

      results.push({
        teamId: team.id,
        warnings: warning,
        errors: errors,
        valid: teamValid,
      });
    }

    return results;
  }
}
