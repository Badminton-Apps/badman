import { SubEventTypeEnum } from '@badman/utils';
import {
  EnrollmentData,
  EnrollmentOutput,
  EnrollmentValidationError,
} from '../../../models';
import { Rule } from './_rule.base';

export class PlayerMinLevelRule extends Rule {
  async validate(enrollment: EnrollmentData): Promise<EnrollmentOutput> {
    const errors = [] as EnrollmentValidationError[];
    const valid: {
      teamId: string;
      valid: boolean;
    }[] = [];
    
    for (const { team, teamPlayers, basePlayers, subEvent } of enrollment.teams) {
      let teamValid = true;
      if (team.teamNumber != 1) {
        const uniquePlayers = new Set([...teamPlayers, ...basePlayers]);

        for (const player of uniquePlayers) {
          const ranking = player?.rankingPlaces?.[0];

          if (!ranking) {
            continue;
          }

          if (ranking.single < subEvent.maxLevel) {
            teamValid = false;
            errors.push({
              message: 'all.competition.team-enrollment.errors.player-min-level',
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
              message: 'all.competition.team-enrollment.errors.player-min-level',
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
            team.type === SubEventTypeEnum.MX &&
            ranking.mix < subEvent.maxLevel
          ) {
            teamValid = false;

            errors.push({
              message: 'all.competition.team-enrollment.errors.player-min-level',
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

      valid.push({
        teamId: team.id,
        valid: teamValid,
      });
    }

    return {
      valid,
      errors,
    };
  }
}
