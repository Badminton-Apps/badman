import { AssemblyOutput, AssemblyValidationData } from '../../../models';
import { Rule } from './_rule.base';

export class TeamBaseIndexRule extends Rule {
  async validate(assembly: AssemblyValidationData): Promise<AssemblyOutput> {
    const { team, teamIndex, meta } = assembly;

    if (
      team?.teamNumber != 1 &&
      (teamIndex ?? 0) < (meta?.competition?.teamIndex ?? 0)
    ) {
      return {
        valid: false,
        errors: [
          {
            message: 'all.competition.team-assembly.errors.team-index',
            params: {
              teamIndex,
              baseIndex: meta?.competition?.teamIndex,
            },
          },
        ],
      };
    }

    return {
      valid: true,
      errors: [],
    };
  }
}
