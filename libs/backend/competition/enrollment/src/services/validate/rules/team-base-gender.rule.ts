import { SubEventTypeEnum } from '@badman/utils';
import { EnrollmentValidationData, EnrollmentValidationError, RuleResult } from '../../../models';
import { Rule } from './_rule.base';

/**
 * Checks if the players is the correct gender for the baseteam
 */
export class TeamBaseGenderRule extends Rule {
  async validate(enrollment: EnrollmentValidationData): Promise<RuleResult[]> {
    const results = [] as RuleResult[];

    for (const { basePlayers, team } of enrollment.teams) {
      if (!team?.id) {
        continue;
      }

      const errors = [] as EnrollmentValidationError[];
      const warnings = [] as EnrollmentValidationError[];

      // if type is mix 2 players should be male and 2 female
      if (team?.type == SubEventTypeEnum.MX) {
        const malePlayers = basePlayers?.filter((p) => p.gender == 'M') ?? [];
        const femalePlayers = basePlayers?.filter((p) => p.gender == 'F') ?? [];
        if (malePlayers.length != 2 || femalePlayers.length != 2) {
          errors.push({
            message: 'all.competition.team-enrollment.errors.base-gender-mix',
            params: {
              maleCount: malePlayers.length,
              femaleCount: femalePlayers.length,
              
            },
          });
        }
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
