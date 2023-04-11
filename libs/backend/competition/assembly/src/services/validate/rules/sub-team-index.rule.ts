import { SubEventTypeEnum } from '@badman/utils';
import { AssemblyData, AssemblyOutput, ValidationError } from '../../../models';
import { Rule } from './_rule.base';

/**
 * Checks if the substitudes are not better then players from active team (titulars)
 */
export class SubTeamIndexRule extends Rule {
  async validate(assembly: AssemblyData): Promise<AssemblyOutput> {
    const { meta, type, team, subtitudes } = assembly;
    const warnings = [] as ValidationError[];

    if (team.teamNumber != 1) {
      // sort players by sum of their ranking places
      const sortedPlayers = meta.competition.players
        .map((player) => {
          return {
            player,
            sum:
              player.single +
              player.double +
              (type == SubEventTypeEnum.MX ? player.mix : 0),
          };
        })
        .filter((p) => p)
        .sort((a, b) => b.sum - a.sum);

      for (const sub of subtitudes) {
        const subRanking = sub?.rankingPlaces?.[0];
        if (!subRanking) {
          continue;
        }

        const sum =
          subRanking.single +
          subRanking.double +
          (type == SubEventTypeEnum.MX ? subRanking.mix : 0);

        // find all players with higher sum
        const higherPlayers = sortedPlayers.filter((p) => p.sum > sum);

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
