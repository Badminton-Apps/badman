import { SubEventTypeEnum } from '@badman/utils';
import {
  EnrollmentValidationData,
  RuleResult,
  EnrollmentValidationError,
} from '../../../models';
import { Rule } from './_rule.base';

export class PlayerBaseRule extends Rule {
  async validate(enrollment: EnrollmentValidationData) {
    const results = [] as RuleResult[];
    const playerCountMap = new Map<string, Map<SubEventTypeEnum, number>>();

    // Count the occurrences of each player in basePlayers arrays per type of team
    for (const { basePlayers, team } of enrollment.teams) {
      for (const player of basePlayers) {
        const countMap =
          playerCountMap.get(player.id) || new Map<SubEventTypeEnum, number>();
        const count = countMap.get(team.type) || 0;
        countMap.set(team.type, count + 1);
        playerCountMap.set(player.id, countMap);
      }
    }

    // Check if a player doesn't exist in 2 base teams of the same type
    for (const { team, basePlayers } of enrollment.teams) {
      const errors = [] as EnrollmentValidationError[];
      let teamValid = true;

      for (const player of basePlayers) {
        const countMap = playerCountMap.get(player.id);
        if (countMap && countMap.get(team.type) > 1) {
          // find all teams that have this player in basePlayers of the same type
          const otherTeams = enrollment.teams.filter(
            (t) =>
              t.team.id != team.id &&
              t.team.type === team.type &&
              t.basePlayers.includes(player)
          );

          // generate the error message for each team
          for (const otherTeam of otherTeams) {
            teamValid = false;
            errors.push({
              message: 'all.competition.team-enrollment.errors.base-other-team',
              params: {
                player: player,
                teamId: otherTeam.team?.id,
              },
            });
          }
        }
      }

      results.push({
        teamId: team.id,
        errors,
        valid: teamValid,
      });
    }

    return results;
  }
}
