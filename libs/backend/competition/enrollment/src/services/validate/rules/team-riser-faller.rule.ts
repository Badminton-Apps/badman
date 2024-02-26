import { isFirstHigher } from '@badman/utils';
import { EnrollmentValidationData, RuleResult, EnrollmentValidationError } from '../../../models';
import { Rule } from './_rule.base';

/**
 * If a team was a riser or faller, it should be higher/lower then previous year
 */
export class TeamRiserFallerRule extends Rule {
  async validate(enrollment: EnrollmentValidationData) {
    const results = [] as RuleResult[];

    for (const { team, previousSeasonTeam, subEvent } of enrollment.teams) {
      if (!team?.id || !previousSeasonTeam?.entry?.subEventCompetition) {
        continue;
      }

      const errors = [] as EnrollmentValidationError[];

      if (!subEvent) {
        continue;
      }

      if (
        previousSeasonTeam?.entry?.standing?.riser &&
        isFirstHigher(subEvent, previousSeasonTeam?.entry?.subEventCompetition) !== 'better'
      ) {
        errors.push({
          message: 'all.competition.team-enrollment.errors.riser',
          params: {
            team,
          },
        });
      } else if (
        previousSeasonTeam?.entry?.standing?.faller &&
        isFirstHigher(subEvent, previousSeasonTeam?.entry?.subEventCompetition) !== 'lower'
      ) {
        errors.push({
          message: 'all.competition.team-enrollment.errors.faller',
          params: {
            team,
          },
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
