import { AssemblyData, AssemblyOutput } from '../../../models';
import { Rule } from './_rule.base';

export class TeamBaseIndexRule extends Rule {
  async validate(assembly: AssemblyData): Promise<AssemblyOutput> {
    const { team, teamIndex, meta } = assembly;

    if (team.teamNumber != 1 && teamIndex < meta.competition.teamIndex) {
      return {
        valid: false,
        errors: [
          {
            message: 'competition.team-assembly.errors.team-index',
            params: {
              teamIndex,
              baseIndex: meta.competition.teamIndex,
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
