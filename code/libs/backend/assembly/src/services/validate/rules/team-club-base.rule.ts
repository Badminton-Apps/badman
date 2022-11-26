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
      subtitudes
    } = assembly;

    const players = [
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

          ...subtitudes
        ].filter((p) => p != undefined)
      ),
    ];

    const errors = [] as ValidationError[];

    for (const oMeta of otherMeta) {
      const metaPlayers = oMeta.competition.players?.map((p) => p.id);
      for (const player of players) {
        if (metaPlayers?.includes(player.id)) {
          errors.push({
            message: 'team-assembly.error.club-base-other-team',
            params: {
              player: player.fullName,
            },
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
