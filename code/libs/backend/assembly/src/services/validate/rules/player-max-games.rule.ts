import { Player, SubEventType } from '@badman/backend-database';
import { AssemblyData, AssemblyOutput, ValidationError } from '../../../models';
import { Rule } from './_rule.base';

export class PlayerMaxGamesRule extends Rule {
  async validate(assembly: AssemblyData): Promise<AssemblyOutput> {
    const {
      single1,
      single2,
      single3,
      single4,
      double1,
      double2,
      double3,
      double4,
      type,
    } = assembly;

    const errors = [] as ValidationError[];

    // Check if a player has max 1 single game and 2 double game

    const singlePlayers = [single1, single2, single3, single4].filter(
      (p) => p !== undefined
    );

    const uniqueSinglePlayers = [...new Set(singlePlayers)];

    // Check if a player has max 1 single game
    for (const player of uniqueSinglePlayers) {
      const found = singlePlayers.filter((p) => p.id === player.id);
      if (found.length > 1) {
        errors.push({
          message: 'team-assembly.error.player-max-single-games',
          params: {
            fullName: player.fullName,
          },
        });
      }
    }
    let doublePlayers: Player[] = [];

    if (type == SubEventType.MX) {
      doublePlayers = [...double1, ...double2].filter((p) => p !== undefined);

      const mixedPlayers = [...double3, ...double4];

      const uniqueMixPlayers = [...new Set(mixedPlayers)];

      // Check if a player has max 2 double game
      for (const player of uniqueMixPlayers) {
        const found = mixedPlayers.filter((p) => p.id === player.id);
        if (found.length > 1) {
          errors.push({
            message: 'team-assembly.error.player-max-mix-games',
            params: {
              fullName: player.fullName,
            },
          });
        }
      }
    } else {
      doublePlayers = [...double1, ...double2, ...double3, ...double4].filter(
        (p) => p !== undefined
      );
    }

    const uniqueDoublePlayers = [...new Set(doublePlayers)];

    // Check if a player has max 2 double game
    for (const player of uniqueDoublePlayers) {
      const found = doublePlayers.filter((p) => p.id === player.id);
      if (found.length > 2) {
        errors.push({
          message: 'team-assembly.error.player-max-double-games',
          params: {
            fullName: player.fullName,
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
