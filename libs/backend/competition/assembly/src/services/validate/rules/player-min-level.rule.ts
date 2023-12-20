import { SubEventTypeEnum } from '@badman/utils';
import {
  AssemblyValidationData,
  AssemblyOutput,
  AssemblyValidationError,
} from '../../../models';
import { Rule } from './_rule.base';
import { Player } from '@badman/backend-database';

export type PlayerMinLevelRuleParams = {
  player: Partial<Player> & { ranking: number };
  minLevel: number;
  rankingType: 'single' | 'double' | 'mix';
};

/**
 * Checks if the player isn't better than the max allowed level of the subevent
 * 
 * If the player has a level exception, the player is allowed to be better than the max level
 */
export class PlayerMinLevelRule extends Rule {
  async validate(assembly: AssemblyValidationData): Promise<AssemblyOutput> {
    const {
      system,
      team,
      meta,
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

    const errors = [] as AssemblyValidationError<PlayerMinLevelRuleParams>[];
    let valid = true;

    if (!system?.amountOfLevels) {
      throw new Error('System has no amount of levels');
    }

    if (!subEvent?.maxLevel) {
      throw new Error('Subevent has no max level');
    }

    if (team?.teamNumber != 1) {
      const uniquePlayers = new Set([
        single1,
        single2,
        single3,
        single4,
        ...(double1 ?? []),
        ...(double2 ?? []),
        ...(double3 ?? []),
        ...(double4 ?? []),

        ...(subtitudes ?? []),
      ]);

      for (const player of uniquePlayers) {
        const ranking = player?.rankingPlaces?.[0];

        if (!ranking) {
          continue;
        }

        const metaPlayer = meta?.competition?.players.find((p) => p.id === player.id);


        ranking.single = ranking.single ?? system.amountOfLevels;
        ranking.double = ranking.double ?? system.amountOfLevels;
        ranking.mix = ranking.mix ?? system.amountOfLevels;

        if (ranking.single < subEvent.maxLevel && !metaPlayer?.levelException) {
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

        if (ranking.double < subEvent.maxLevel && !metaPlayer?.levelException) {
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

        if (type === SubEventTypeEnum.MX && ranking.mix < subEvent.maxLevel && !metaPlayer?.levelException) {
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
