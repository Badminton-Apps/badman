import { EntryCompetitionPlayer, Team } from '@badman/backend-database';
import { SubEventTypeEnum } from '@badman/utils';
import { EnrollmentValidationData, EnrollmentValidationError, RuleResult } from '../../../models';
import { Rule } from './_rule.base';

/**
 * Checks if the players is the correct gender for the team
 */
export class PlayerGenderRule extends Rule {
  async validate(enrollment: EnrollmentValidationData): Promise<RuleResult[]> {
    const results = [] as RuleResult[];

    for (const { basePlayers, teamPlayers, team, backupPlayers } of enrollment.teams) {
      if (!team?.id) {
        continue;
      }

      const errors = [] as EnrollmentValidationError[];
      const warnings = [] as EnrollmentValidationError[];

      if (team?.type == SubEventTypeEnum.M) {
        errors.push(
          ...this._checkGender([...(teamPlayers ?? []), ...(basePlayers ?? [])], 'M', team),
        );
      } else if (team?.type == SubEventTypeEnum.F) {
        errors.push(
          ...this._checkGender([...(teamPlayers ?? []), ...(basePlayers ?? [])], 'F', team),
        );
      }

      if (team?.type == SubEventTypeEnum.M) {
        warnings.push(...this._checkGender(backupPlayers ?? [], 'M', team));
      } else if (team?.type == SubEventTypeEnum.F) {
        warnings.push(...this._checkGender(backupPlayers ?? [], 'F', team));
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

  private _checkGender(
    players: Partial<EntryCompetitionPlayer>[],
    gender: string,
    team: Partial<Team> | Team,
  ): EnrollmentValidationError[] {
    const uniquePlayers = [...new Set(players?.filter((p) => p != undefined && p != null))];
    const wrong = uniquePlayers?.filter((p) => p?.gender != gender);
    if (wrong) {
      return wrong.map((p) => ({
        message: 'all.competition.team-enrollment.errors.player-gender',
        params: {
          player: {
            id: p?.id,
            fullName: p?.player?.fullName,
            gender: p?.gender,
          },
          gender,
          teamId: team?.id,
        },
      }));
    }
    return [];
  }
}
