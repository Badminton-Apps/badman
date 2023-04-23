import { Player, Team } from '@badman/backend-database';
import { SubEventTypeEnum } from '@badman/utils';
import {
  EnrollmentValidationData,
  RuleResult,
  EnrollmentValidationError,
} from '../../../models';
import { Rule } from './_rule.base';

/**
 * Checks
 */
export class PlayerGenderRule extends Rule {
  async validate(enrollment: EnrollmentValidationData): Promise<RuleResult[]> {
    const results = [] as RuleResult[];

    for (const { basePlayers, teamPlayers, team, backupPlayers } of enrollment.teams) {
      const errors = [] as EnrollmentValidationError[];
      let teamValid = true;
      const warnins = [] as EnrollmentValidationError[];

      if (team?.type == SubEventTypeEnum.M) {
        errors.push(
          ...this._checkGender([...teamPlayers, ...basePlayers], 'M', team)
        );
      } else if (team?.type == SubEventTypeEnum.F) {
        errors.push(
          ...this._checkGender([...teamPlayers, ...basePlayers], 'F', team)
        );
      }

      if (team?.type == SubEventTypeEnum.M) {
        warnins.push(
          ...this._checkGender(backupPlayers, 'M', team)
        );
      } else if (team?.type == SubEventTypeEnum.F) {
        warnins.push(
          ...this._checkGender(backupPlayers, 'F', team)
        );
      }

      if (errors.length > 0) {
        teamValid = false;
      }

      results.push({
        teamId: team.id,
        errors,
        warnings: warnins,
        valid: teamValid,
      });
    }

    return results;
  }

  private _checkGender(
    players: Player[],
    gender: string,
    team: Partial<Team> | Team
  ): EnrollmentValidationError[] {
    const uniquePlayers = [
      ...new Set(players?.filter((p) => p != undefined && p != null)),
    ];
    const wrong = uniquePlayers?.filter((p) => p?.gender != gender);
    if (wrong) {
      return wrong.map((p) => ({
        message: 'all.competition.team-enrollment.errors.player-gender',
        params: {
          player: {
            id: p?.id,
            fullName: p?.fullName,
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
