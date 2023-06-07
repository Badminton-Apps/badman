import { SubEventTypeEnum } from '@badman/utils';
import {
  EnrollmentValidationData,
  EnrollmentValidationError,
  RuleResult,
} from '../../../models';
import { Rule } from './_rule.base';

/**
 * Checks if the min level of the subEvent is not crossed
 */
export class PlayerMinLevelRule extends Rule {
  async validate(enrollment: EnrollmentValidationData) {
    const results = [] as RuleResult[];
    for (const {
      team,
      teamPlayers,
      basePlayers,
      subEvent,
    } of enrollment.teams) {
      const errors = [] as EnrollmentValidationError[];
      const warnings = [] as EnrollmentValidationError[];

      if (!subEvent) {
        continue;
      }

      if (team?.teamNumber != 1) {
        for (const player of basePlayers) {
          if (player.single < subEvent.maxLevel && !player.levelException) {
            errors.push({
              message:
                'all.competition.team-enrollment.errors.player-min-level',
              params: {
                player: {
                  id: player?.id,
                  fullName: player.player?.fullName,
                  ranking: player.single,
                },
                minLevel: subEvent.maxLevel,
                rankingType: 'single',
              },
            });
          }

          if (player.double < subEvent.maxLevel && !player.levelException) {
            errors.push({
              message:
                'all.competition.team-enrollment.errors.player-min-level',
              params: {
                player: {
                  id: player?.id,
                  fullName: player.player?.fullName,
                  ranking: player.double,
                },
                minLevel: subEvent.maxLevel,
                rankingType: 'double',
              },
            });
          }

          if (
            team?.type === SubEventTypeEnum.MX &&
            player.mix < subEvent.maxLevel &&
            !player.levelException
          ) {
            errors.push({
              message:
                'all.competition.team-enrollment.errors.player-min-level',
              params: {
                player: {
                  id: player?.id,
                  fullName: player.player?.fullName,
                  ranking: player.mix,
                },
                minLevel: subEvent.maxLevel,
                rankingType: 'mix',
              },
            });
          }
        }

        for (const player of teamPlayers) {
          if (player.single < subEvent.maxLevel && !player.levelException) {
            warnings.push({
              message:
                'all.competition.team-enrollment.errors.player-min-level',
              params: {
                player: {
                  id: player?.id,
                  fullName: player.player?.fullName,
                  ranking: player.single,
                },
                minLevel: subEvent.maxLevel,
                rankingType: 'single',
              },
            });
          }

          if (player.double < subEvent.maxLevel && !player.levelException) {
            warnings.push({
              message:
                'all.competition.team-enrollment.errors.player-min-level',
              params: {
                player: {
                  id: player?.id,
                  fullName: player.player?.fullName,
                  ranking: player.double,
                },
                minLevel: subEvent.maxLevel,
                rankingType: 'double',
              },
            });
          }

          if (
            team?.type === SubEventTypeEnum.MX &&
            player.mix < subEvent.maxLevel &&
            !player.levelException
          ) {
            warnings.push({
              message:
                'all.competition.team-enrollment.errors.player-min-level',
              params: {
                player: {
                  id: player?.id,
                  fullName: player.player?.fullName,
                  ranking: player.mix,
                },
                minLevel: subEvent.maxLevel,
                rankingType: 'mix',
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
