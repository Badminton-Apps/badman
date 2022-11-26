import { AssemblyData, AssemblyOutput, ValidationError } from '../../../models';
import { Rule } from './_rule.base';

/**
 * Checks if all players have the competition status active
 */
export class CompetitionStatusRule extends Rule {
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
      subtitudes,
    } = assembly;

    const errors = [] as ValidationError[];
    let valid = true;

    // If any of the players has competitionPlayer on false, the assembly is not valid
    for (const player of [
      single1,
      single2,
      single3,
      single4,
      ...double1,
      ...double2,
      ...double3,
      ...double4,
      ...subtitudes,
    ]) {
      if (!player?.competitionPlayer) {
        valid = false;
        errors.push({
          message: 'team-assembly.error.competition-status',
          params: {
            fullName: player?.fullName,
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
