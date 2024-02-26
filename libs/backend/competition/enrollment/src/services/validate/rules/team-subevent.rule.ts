import { EnrollmentValidationData, EnrollmentValidationError, RuleResult } from '../../../models';
import { Rule } from './_rule.base';

export class TeamSubEventRule extends Rule {
  async validate(enrollment: EnrollmentValidationData) {
    const results = [] as RuleResult[];

    for (const { subEvent, team } of enrollment.teams) {
      if (!team?.id) {
        continue;
      }
      const errors = [] as EnrollmentValidationError[];
      if (!subEvent) {
        errors.push({
          message: 'all.competition.team-enrollment.errors.no-subevent',
        });
      }

      results.push({
        teamId: team.id,
        errors,
        valid: errors.length === 0,
      });
    }

    return results;
  }
}
