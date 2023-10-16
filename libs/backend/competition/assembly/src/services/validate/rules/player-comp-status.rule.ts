import { Player } from '@badman/backend-database';
import {
  AssemblyValidationData,
  AssemblyOutput,
  AssemblyValidationError,
} from '../../../models';
import { Rule } from './_rule.base';

export type PlayerCompStatusRuleParams = {
  player: Partial<Player>;
};

/**
 * Checks if all players have the competition status active
 */
export class PlayerCompStatusRule extends Rule {
  async validate(assembly: AssemblyValidationData): Promise<AssemblyOutput> {
    const {
      single1,
      single2,
      single3,
      single4,
      double1,
      double2,
      double3,
      double4,
      subtitudes,
    } = assembly;

    const errors = [] as AssemblyValidationError<PlayerCompStatusRuleParams>[];
    let valid = true;

    // If any of the players has competitionPlayer on false, the assembly is not valid
    for (const player of [
      single1,
      single2,
      single3,
      single4,
      ...(double1 ?? []),
      ...(double2 ?? []),
      ...(double3 ?? []),
      ...(double4 ?? []),
      ...(subtitudes ?? []),
    ]) {
      if (!player) {
        continue;
      }

      if (!player.competitionPlayer) {
        valid = false;
        errors.push({
          message: 'all.competition.team-assembly.errors.comp-status-html',
          params: {
            player: {
              id: player?.id,
              fullName: player?.fullName,
            },
          },
        });
      }
    }

    return {
      valid,
      errors,
    };
  }
}
