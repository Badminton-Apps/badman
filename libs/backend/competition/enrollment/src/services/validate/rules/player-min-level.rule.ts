import { SubEventTypeEnum } from '@badman/utils';
import {
  EnrollmentValidationData,
  EnrollmentValidationError,
  RuleResult,
} from '../../../models';
import { Rule } from './_rule.base';
import { RankingPlace } from '@badman/backend-database';
import { single } from 'rxjs';

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
      system,
    } of enrollment.teams) {
      const errors = [] as EnrollmentValidationError[];
      let teamValid = true;

      if (!subEvent) {
        continue;
      }

      if (team?.teamNumber != 1) {
        const uniquePlayers = new Set([...teamPlayers, ...basePlayers]);

        for (const player of uniquePlayers) {
          let ranking = player?.rankingPlaces?.[0];

          const bestRankingMin2 =
            Math.min(
              ranking?.single ?? system.amountOfLevels,
              ranking?.double ?? system.amountOfLevels,
              ranking?.mix ?? system.amountOfLevels
            ) - 2;

          if (bestRankingMin2 < 0) {
            this.logger.log(`bestRankingMin2: ${bestRankingMin2}`);
            this.logger.log(`ranking: ${JSON.stringify(ranking)}`);
          }

          // if the player has a missing rankingplace, we set the lowest possible ranking
          ranking = {
            ...ranking,
            single: ranking?.single ?? bestRankingMin2,
            double: ranking?.double ?? bestRankingMin2,
            mix: ranking?.mix ?? bestRankingMin2,
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
