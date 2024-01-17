import { Player } from '@badman/backend-database';
import { SubEventTypeEnum } from '@badman/utils';
import { AssemblyValidationData, AssemblyOutput, AssemblyValidationError } from '../../../models';
import { Rule } from './_rule.base';

export type PlayerMaxGamesRuleParams = {
  player: Partial<Player>;
  max: number;
};

/**
 * Checks if a player has max 1 single game and 2 double game
 */
export class PlayerMaxGamesRule extends Rule {
  async validate(assembly: AssemblyValidationData): Promise<AssemblyOutput> {
    const { single1, single2, single3, single4, double1, double2, double3, double4, type } = assembly;

    const errors = [] as AssemblyValidationError<PlayerMaxGamesRuleParams>[];

    // Check if a player has max 1 single game and 2 double game

    const singlePlayers = [single1, single2, single3, single4].filter((p) => p !== undefined);

    const uniqueSinglePlayers = [...new Set(singlePlayers)];

    // Check if a player has max 1 single game
    for (const player of uniqueSinglePlayers) {
      const found = singlePlayers.filter((p) => p?.id === player?.id);
      if (found.length > 1) {
        errors.push({
          message: 'all.competition.team-assembly.errors.player-max-single-games',
          params: {
            player: {
              id: player?.id,
              fullName: player?.fullName,
            },
            max: 1,
          },
        });
      }
    }
    let doublePlayers: Player[] = [];

    if (type == SubEventTypeEnum.MX) {
      doublePlayers = [...(double1 ?? []), ...(double2 ?? [])].filter((p) => p !== undefined);

      const mixedPlayers = [...(double3 ?? []), ...(double4 ?? [])];

      const uniqueMixPlayers = [...new Set(mixedPlayers)];

      // Check if a player has max 1 mixed game
      for (const player of uniqueMixPlayers) {
        const found = mixedPlayers.filter((p) => p.id === player.id);
        if (found.length > 1) {
          errors.push({
            message: 'all.competition.team-assembly.errors.player-max-mix-games',
            params: {
              player: {
                id: player.id,
                fullName: player.fullName,
              },
              max: 1,
            },
          });
        }
      }
    } else {
      doublePlayers = [...(double1 ?? []), ...(double2 ?? []), ...(double3 ?? []), ...(double4 ?? [])].filter(
        (p) => p !== undefined,
      );
    }

    const uniqueDoublePlayers = [...new Set(doublePlayers)];

    // Check if a player has max 2 double game
    for (const player of uniqueDoublePlayers) {
      const found = doublePlayers.filter((p) => p.id === player.id);
      if (found.length > 2) {
        errors.push({
          message: 'all.competition.team-assembly.errors.player-max-double-games',
          params: {
            player: {
              id: player.id,
              fullName: player.fullName,
            },
            max: 2,
          },
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
