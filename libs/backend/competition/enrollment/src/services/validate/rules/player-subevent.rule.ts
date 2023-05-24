import {
  EnrollmentValidationData,
  EnrollmentValidationError,
  EnrollmentValidationTeam,
  RuleResult,
} from '../../../models';
import { Rule } from './_rule.base';

/**
 * Checks if a player is part of the base of team A and plays in team B as team or backup player
 */
export class PlayerSubEventRule extends Rule {
  async validate(enrollment: EnrollmentValidationData) {
    const results = [] as RuleResult[];

    // create a map of player ids and which enrollment they are part of
    const playerEnrollmentsMap = new Map<string, EnrollmentValidationTeam[]>();
    enrollment.teams.forEach((team) => {
      team.teamPlayers.forEach((player) => {
        const current = playerEnrollmentsMap.get(player.id);
        return playerEnrollmentsMap.set(player.id, [...(current || []), team]);
      });

      team.backupPlayers.forEach((player) => {
        const current = playerEnrollmentsMap.get(player.id);
        return playerEnrollmentsMap.set(player.id, [...(current || []), team]);
      });
    });

    const warnings = new Map<string, EnrollmentValidationError[]>();

    // check if a player doesn't exist in 2 base teams
    for (const { team, subEvent, basePlayers } of enrollment.teams) {
      if (!subEvent) {
        continue;
      }

      // check each player in the team's basePlayers array
      for (const player of basePlayers) {
        // find the player enrollments where not baseplayer
        const playerInOtherTeam = playerEnrollmentsMap.get(player.id) || [];

        // check if any enrollments are for the same subevent but different team
        const enrollmentSameSubEvent = playerInOtherTeam.filter(
          (en) => en?.subEvent?.id === subEvent.id && en.team.id !== team.id
        );

        for (const otherTeam of enrollmentSameSubEvent) {
          // player is also in another team's teamPlayers or backupPlayers array for the same SubEvent
          const currentWrans = warnings.get(otherTeam.team.id);

          warnings.set(otherTeam.team.id, [
            ...(currentWrans || []),
            {
              message: `all.competition.team-enrollment.errors.player-subevent`,
              params: {
                player: {
                  id: player.id,
                  fullName: player.player.fullName,
                },
                team,
                subEvent,
              },
            },
          ]);
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
