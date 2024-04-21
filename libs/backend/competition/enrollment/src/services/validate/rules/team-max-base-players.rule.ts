import { EnrollmentValidationData, EnrollmentValidationError, RuleResult } from '../../../models';
import { Rule } from './_rule.base';

export class TeamMaxBasePlayersRule extends Rule {
  async validate(enrollment: EnrollmentValidationData) {
    const results = [] as RuleResult[];

    for (const { subEvent, basePlayers, team } of enrollment.teams) {
      if (!team?.id) {
        continue;
      }

      const amountOfBasePlayers = subEvent?.eventCompetition?.meta?.amountOfBasePlayers;
      if (!amountOfBasePlayers) {
        continue;
      }

      const errors = [] as EnrollmentValidationError[];
      if (amountOfBasePlayers > (basePlayers?.length ?? 0) ) {
        errors.push({
          message: 'all.competition.team-assembly.errors.too-many-base-players',
          params: {
            amountOfBasePlayers,
          },
        });
      }

      if (amountOfBasePlayers < (basePlayers?.length ?? 0)) {
        errors.push({
          message: 'all.competition.team-assembly.errors.too-few-base-players',
          params: {
            amountOfBasePlayers,
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
