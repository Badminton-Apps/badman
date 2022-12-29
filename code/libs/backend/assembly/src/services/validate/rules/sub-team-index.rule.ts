import { Player, SubEventType } from '@badman/backend-database';
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
              (type == SubEventType.MX ? player.mix : 0),
          };
        })
        .filter((p) => p)
        .sort((a, b) => b.sum - a.sum);

      const basePlayers = await Player.findAll({
        attributes: ['id', 'fullName', 'firstName', 'lastName'],
        where: {
          id: sortedPlayers.map((p) => p.player.id),
        },
      });

      for (const sub of subtitudes) {
        const subRanking = sub?.rankingPlaces?.[0];
        if (!subRanking) {
          continue;
        }

        const sum =
          subRanking.single +
          subRanking.double +
          (type == SubEventType.MX ? subRanking.mix : 0);

        // find all players with higher sum
        const higherPlayers = sortedPlayers.filter((p) => p.sum > sum);

        if (higherPlayers) {
          warnings.push({
            message: 'team-assembly.warning.subtitute-team-index',
            params: {
              sub: sub.id,
              players: higherPlayers?.map((p) => {
                const basePlayer = basePlayers.find(
                  (bp) => bp.id == p.player.id
                );
                return { id: basePlayer.id, fullName: basePlayer.fullName };
              }),
            },
          });
        }
      }
    }

    return {
      valid: true,
      warnings,
    };
  }
}
