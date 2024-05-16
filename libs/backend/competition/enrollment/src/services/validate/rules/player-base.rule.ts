import { sortTeams } from '@badman/utils';
import { EnrollmentValidationData, EnrollmentValidationError, RuleResult } from '../../../models';
import { Rule } from './_rule.base';

/**
 * Checks if a player is in the basePlayers array of 2 teams of the same type
 */
export class PlayerBaseRule extends Rule {
  async validate(enrollment: EnrollmentValidationData) {
    const results = [] as RuleResult[];
    const sortedTeamsByTeamNumberAndType = enrollment.teams.sort((a, b) =>
      sortTeams(a.team, b.team),
    );

    for (const {
      basePlayers,
      backupPlayers,
      teamPlayers,
      team,
      subEvent,
    } of sortedTeamsByTeamNumberAndType) {
      if (!team?.id) {
        continue;
      }

      const otherTeams = sortedTeamsByTeamNumberAndType.filter(
        (t) =>
          t.team?.id != team.id &&
          t.team?.type === team.type &&
          // same or lower level
          (t.subEvent?.level ?? 0) <= (subEvent?.level ?? 0) &&
          // same type
          t.subEvent?.eventType === subEvent?.eventType,
      );

      const errors = [] as EnrollmentValidationError[];
      const warnings = [] as EnrollmentValidationError[];

      for (const player of basePlayers ?? []) {
        if (!player.id || !team?.type) {
          continue;
        }

        for (const otherTeam of otherTeams) {
          if (otherTeam.basePlayers?.find((p) => p.id === player.id)) {
            errors.push({
              message: 'all.competition.team-enrollment.errors.base-other-team',
              params: {
                player: {
                  id: player.player?.id,
                  fullName: player.player?.fullName,
                },
                teamId: team?.id,
              },
            });
          }
        }
      }

      for (const player of [...(teamPlayers ?? []), ...(backupPlayers ?? [])]) {
        if (!player.id || !team?.type) {
          continue;
        }

        for (const otherTeam of otherTeams) {
          if (otherTeam.basePlayers?.find((p) => p.id === player.id)) {
            warnings.push({
              message: 'all.competition.team-enrollment.warnings.base-other-team',
              params: {
                player: {
                  id: player.player?.id,
                  fullName: player.player?.fullName,
                },
                teamId: team?.id,
              },
            });
          }
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
