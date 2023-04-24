import { SubEventTypeEnum } from '@badman/utils';
import { AssemblyValidationData, AssemblyOutput, AssemblyValidationError } from '../../../models';
import { Rule } from './_rule.base';

export class PlayerMinLevelRule extends Rule {
  async validate(assembly: AssemblyValidationData): Promise<AssemblyOutput> {
    const {
      team,
      single1,
      single2,
      single3,
      single4,
      double1,
      double2,
      double3,
      double4,
      subtitudes,
      type,
      subEvent,
    } = assembly;

    const errors = [] as AssemblyValidationError[];
    let valid = true;

    if (team.teamNumber != 1) {
      const uniquePlayers = new Set([
        single1,
        single2,
        single3,
        single4,
        ...double1,
        ...double2,
        ...double3,
        ...double4,

        ...subtitudes,
      ]);

      for (const player of uniquePlayers) {
        const ranking = player?.rankingPlaces?.[0];

        if (!ranking) {
          continue;
        }

        if (ranking.single < subEvent.maxLevel) {
          valid = false;
          errors.push({
            message: 'all.competition.team-assembly.errors.player-min-level',
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
          valid = false;
          errors.push({
            message: 'all.competition.team-assembly.errors.player-min-level',
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

        if (type === SubEventTypeEnum.MX && ranking.mix < subEvent.maxLevel) {
          valid = false;
          errors.push({
            message: 'all.competition.team-assembly.errors.player-min-level',
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

    return {
      valid,
      errors,
    };
  }
}
