import { EnrollmentValidationData, EnrollmentValidationError, RuleResult } from '../../../models';
import { Rule } from './_rule.base';

/**
 * Checks if all players have the competition status active
 */
export class PlayerCompStatusRule extends Rule {
  async validate(enrollment: EnrollmentValidationData) {
    const results = [] as RuleResult[];

    for (const { basePlayers, teamPlayers, team } of enrollment.teams) {
      if (!team?.id) {
        continue;
      }

      const errors = [] as EnrollmentValidationError[];
      const warnings = [] as EnrollmentValidationError[];

      // If any of the players has competitionPlayer on false, the enrollment is not valid
      for (const player of basePlayers ?? []) {
        if (!player) {
          continue;
        }

        if (!player.player?.competitionPlayer) {
          errors.push({
            message: 'all.competition.team-enrollment.errors.comp-status-base',
            params: {
              player: {
                id: player?.id,
                fullName: player.player?.fullName,
              },
            },
          });
        }
      }

      // If any of the players has competitionPlayer on false, the enrollment is not valid
      for (const player of teamPlayers ?? []) {
        if (!player) {
          continue;
        }

        if (!player.player?.competitionPlayer) {
          warnings.push({
            message: 'all.competition.team-enrollment.errors.comp-status-team',
            params: {
              player: {
                id: player?.id,
                fullName: player.player?.fullName,
              },
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
