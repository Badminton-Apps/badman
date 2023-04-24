import {
  EnrollmentValidationData,
  EnrollmentValidationError,
  RuleResult,
} from '../../../models';
import { Rule } from './_rule.base';

/**
 * Checks if all players have the competition status active
 */
export class CompetitionStatusRule extends Rule {
  async validate(enrollment: EnrollmentValidationData) {
    const results = [] as RuleResult[];

    for (const { basePlayers, teamPlayers, team } of enrollment.teams) {
      const errors = [] as EnrollmentValidationError[];
      const warnings = [] as EnrollmentValidationError[];
      let teamValid = true;

      // If any of the players has competitionPlayer on false, the enrollment is not valid
      for (const player of basePlayers) {
        if (!player) {
          continue;
        }

        if (!player.competitionPlayer) {
          teamValid = false;
          errors.push({
            message: 'all.competition.team-enrollment.errors.comp-status-base',
            params: {
              player: {
                id: player?.id,
                fullName: player?.fullName,
              },
            },
          });
        }
      }

      // If any of the players has competitionPlayer on false, the enrollment is not valid
      for (const player of teamPlayers) {
        if (!player) {
          continue;
        }

        if (!player.competitionPlayer) {
          teamValid = false;
          warnings.push({
            message: 'all.competition.team-enrollment.errors.comp-status-team',
            params: {
              player: {
                id: player?.id,
                fullName: player?.fullName,
              },
            },
          });
        }
      }

      results.push({
        teamId: team.id,
        errors,
        warnings,
        valid: teamValid,
      });
    }

    return results;
  }
}
