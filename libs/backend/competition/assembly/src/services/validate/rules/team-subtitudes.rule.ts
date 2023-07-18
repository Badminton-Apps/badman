import { SubEventTypeEnum } from '@badman/utils';
import {
  AssemblyValidationData,
  AssemblyOutput,
  AssemblyValidationError,
} from '../../../models';
import { Rule } from './_rule.base';
import { Player } from '@badman/backend-database';

export type TeamSubsIndexRuleParams = {
  subtitute: {
    player: Partial<Player>;
    sum: number;
  };
};

/**
 * Checks if the substitudes are not better then players from active team (titulars)
 */
export class TeamSubsIndexRule extends Rule {
  async validate(assembly: AssemblyValidationData): Promise<AssemblyOutput> {
    const { meta, type, team, subtitudes, system } = assembly;
    const warnings = [] as AssemblyValidationError<TeamSubsIndexRuleParams>[];

    if (!system?.amountOfLevels) {
      throw new Error('System is not defined');
    }

    if (team?.teamNumber != 1) {
      // sort players by sum of their ranking places
      const sortedPlayers = meta?.competition?.players
        .map((player) => {
          return {
            player,
            sum:
              (player.single ?? system.amountOfLevels) +
              (player.double ?? system.amountOfLevels) +
              (type == SubEventTypeEnum.MX
                ? player.mix ?? system.amountOfLevels
                : 0),
          };
        })
        .filter((p) => p)
        .sort((a, b) => b.sum - a.sum);

      for (const sub of subtitudes ?? []) {
        const subRanking = sub?.rankingPlaces?.[0];
        if (!subRanking) {
          continue;
        }

        const sum =
          (subRanking.single ?? system.amountOfLevels) +
          (subRanking.double ?? system.amountOfLevels) +
          (type == SubEventTypeEnum.MX
            ? subRanking.mix ?? system.amountOfLevels
            : 0);

        // find all players with higher sum
        const higherPlayers = sortedPlayers?.filter((p) => p.sum > sum);

        if (higherPlayers) {
          for (const higherPlayer of higherPlayers) {
            warnings.push({
              message:
                'all.competition.team-assembly.warnings.subtitute-team-index',
              params: {
                subtitute: higherPlayer,
              },
            });
          }
        }
      }
    }

    return {
      valid: true,
      warnings,
    };
  }
}
