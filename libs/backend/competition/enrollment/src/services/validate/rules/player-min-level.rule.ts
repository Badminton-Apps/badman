import { SubEventTypeEnum } from '@badman/utils';
import {
  EnrollmentValidationData,
  RuleResult,
  EnrollmentValidationError,
} from '../../../models';
import { Rule } from './_rule.base';
import { RankingPlace } from '@badman/backend-database';

export class PlayerMinLevelRule extends Rule {
  async validate(enrollment: EnrollmentValidationData) {
    const results = [] as RuleResult[];

    for (const {
      team,
      teamPlayers,
      basePlayers,
      subEvent,
      system,
    } of enrollment.teams) {
      const errors = [] as EnrollmentValidationError[];
      let teamValid = true;

      if (team?.teamNumber != 1) {
        const uniquePlayers = new Set([...teamPlayers, ...basePlayers]);

        for (const player of uniquePlayers) {
          let ranking = player?.rankingPlaces?.[0];

          ranking = {
            ...ranking,
            single: ranking.single || system.amountOfLevels,
            double: ranking.double || system.amountOfLevels,
            mix: ranking.mix || system.amountOfLevels,
          } as RankingPlace;

          if (ranking.single < subEvent.maxLevel) {
            teamValid = false;
            errors.push({
              message:
                'all.competition.team-enrollment.errors.player-min-level',
              params: {
                player: {
                  id: player?.id,
                  fullName: player.fullName,
                  ranking: ranking.single,
                },
                minLevel: subEvent.maxLevel,
                rankingType: 'single',
              },
            });
          }

          if (ranking.double < subEvent.maxLevel) {
            teamValid = false;

            errors.push({
              message:
                'all.competition.team-enrollment.errors.player-min-level',
              params: {
                player: {
                  id: player?.id,
                  fullName: player.fullName,
                  ranking: ranking.double,
                },
                minLevel: subEvent.maxLevel,
                rankingType: 'double',
              },
            });
          }

          if (
            team?.type === SubEventTypeEnum.MX &&
            ranking.mix < subEvent.maxLevel
          ) {
            teamValid = false;

            errors.push({
              message:
                'all.competition.team-enrollment.errors.player-min-level',
              params: {
                player: {
                  id: player?.id,
                  fullName: player.fullName,
                  ranking: ranking.mix,
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
        valid: teamValid,
      });
    }

    return results;
  }
}
