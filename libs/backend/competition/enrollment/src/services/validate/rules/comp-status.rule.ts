import {
  EnrollmentValidationData,
  EnrollmentOutput,
  EnrollmentValidationError,
} from '../../../models';
import { Rule } from './_rule.base';

/**
 * Checks if all players have the competition status active
 */
export class CompetitionStatusRule extends Rule {
  async validate(enrollment: EnrollmentValidationData): Promise<EnrollmentOutput> {
    const valid: {
      teamId: string;
      valid: boolean;
    }[] = [];
    const errors = [] as EnrollmentValidationError[];
    const warnings = [] as EnrollmentValidationError[];

    for (const { basePlayers, teamPlayers, team } of enrollment.teams) {
      let teamValid = true;
      
      // If any of the players has competitionPlayer on false, the enrollment is not valid
      for (const player of basePlayers) {
        if (!player) {
          continue;
        }

        if (!player.competitionPlayer) {
          teamValid = false;
          errors.push({
            message: 'all.competition.team-enrollment.errors.comp-status',
            params: {
              id: player?.id,
              fullName: player?.fullName,
              teamId: team.id,
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
            message: 'all.competition.team-enrollment.errors.comp-status',
            params: {
              id: player?.id,
              fullName: player?.fullName,
              teamId: team.id,
            },
          });
        }
      }

      valid.push({
        teamId: team?.id,
        valid: teamValid,
      });
    }

    return {
      valid,
      errors,
      warnings,
    };
  }
}
