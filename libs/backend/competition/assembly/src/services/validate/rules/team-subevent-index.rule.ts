import { AssemblyValidationData, AssemblyOutput } from '../../../models';
import { Rule } from './_rule.base';

export class TeamSubeventIndexRule extends Rule {
  async validate(assembly: AssemblyValidationData): Promise<AssemblyOutput> {
    const { teamIndex: baseTeamIndex, subEvent } = assembly;

    if (baseTeamIndex < subEvent.minBaseIndex) {
      return {
        valid: false,
        errors: [
          {
            message: 'all.competition.team-assembly.errors.team-to-strong',
            params: {
              teamIndex: baseTeamIndex,
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
