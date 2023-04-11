import { Player } from '@badman/backend-database';
import { AssemblyData, AssemblyOutput, ValidationError } from '../../../models';
import { Rule } from './_rule.base';

export class TeamClubBaseRule extends Rule {
  async validate(assembly: AssemblyData): Promise<AssemblyOutput> {
    const {
      otherMeta,
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

    const playersError = [
      ...new Set(
        [
          single1,
          single2,
          single3,
          single4,

          ...double1,
          ...double2,
          ...double3,
          ...double4,
        ].filter((p) => p != undefined)
      ),
    ];

    const playersWarn = [
      ...new Set([...subtitudes].filter((p) => p != undefined)),
    ];

    const errors = [] as ValidationError[];
    const warnings = [] as ValidationError[];

    for (const oMeta of otherMeta) {
      const metaPlayers = oMeta?.competition?.players?.map((p) => p.id);
      if (metaPlayers) {
        errors.push(...this.checkGroup(playersError, metaPlayers));
        warnings.push(...this.checkGroup(playersWarn, metaPlayers));
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private checkGroup(players: Player[], otherPlayers: string[]) {
    const errors = [] as ValidationError[];
    for (const player of players) {
      if (otherPlayers.includes(player.id)) {
        errors.push({
          message: 'all.competition.team-assembly.errors.club-base-other-team',
          params: {
            player: {
              id: player.id,
              fullName: player.fullName,
            },
          },
        });
      }
    }
    return errors;
  }
}
