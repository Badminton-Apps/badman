import { AssemblyData, AssemblyOutput } from '../../../models';
import { Rule } from './_rule.base';

export class TeamSubeventIndexRule extends Rule {
  async validate(assembly: AssemblyData): Promise<AssemblyOutput> {
    const { teamIndex: baseTeamIndex, subEvent } = assembly;

    // check if team is between min and max
    if (
      baseTeamIndex < subEvent.minBaseIndex ||
      baseTeamIndex > subEvent.maxBaseIndex
    ) {
      return {
        valid: false,
        errors: [
          {
            message: 'team-assembly.error.team-to-strong',
            params: {
              baseTeamIndex,
              minIndex: subEvent.minBaseIndex,
              maxIndex: subEvent.maxBaseIndex,
            },
          },
        ],
      };
    }

    return {
      valid: true,
    };
  }
}
