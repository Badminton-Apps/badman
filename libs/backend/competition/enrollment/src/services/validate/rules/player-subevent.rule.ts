import {
  EnrollmentValidationData,
  EnrollmentValidationError,
  EnrollmentValidationTeam,
  RuleResult,
} from '../../../models';
import { Rule } from './_rule.base';

export class PlayerSubEventRule extends Rule {
  async validate(enrollment: EnrollmentValidationData) {
    const results = [] as RuleResult[];

    // create a map of player ids to team and array type
    const playerMap = new Map<
      string,
      { enrollment: EnrollmentValidationTeam; arrayType: string }
    >();
    enrollment.teams.forEach((team) => {
      team.basePlayers.forEach((player) =>
        playerMap.set(player.id, { enrollment: team, arrayType: 'basePlayers' })
      );
      team.teamPlayers.forEach((player) =>
        playerMap.set(player.id, { enrollment: team, arrayType: 'teamPlayers' })
      );
      team.backupPlayers.forEach((player) =>
        playerMap.set(player.id, {
          enrollment: team,
          arrayType: 'backupPlayers',
        })
      );
    });

    const warnings = new Map<string, EnrollmentValidationError[]>();

    // check if a player doesn't exist in 2 base teams
    for (const { team, subEvent, basePlayers } of enrollment.teams) {
      // check each player in the team's basePlayers array
      for (const player of basePlayers) {
        const playerInOtherTeam = playerMap.get(player.id);
        if (
          playerInOtherTeam &&
          playerInOtherTeam.arrayType !== 'basePlayers' &&
          playerInOtherTeam.enrollment.subEvent.id === subEvent.id &&
          playerInOtherTeam.enrollment.team.id !== team.id
        ) {
          // player is also in another team's teamPlayers or backupPlayers array for the same SubEvent
          const currentWrans = warnings.get(
            playerInOtherTeam.enrollment.team.id
          );

          warnings.set(playerInOtherTeam.enrollment.team.id, [
            ...(currentWrans || []),
            {
              message: `all.competition.team-enrollment.errors.player-subevent`,
              params: { player, team, subEvent },
            },
          ]);

          this.logger.warn(playerInOtherTeam.enrollment.team);
        }
      }
    }

    for (const { team } of enrollment.teams) {
      const wrans = warnings.get(team.id);
      results.push({
        teamId: team.id,
        warnings: wrans || [],
        valid: true,
      });
    }

    return results;
  }
}
