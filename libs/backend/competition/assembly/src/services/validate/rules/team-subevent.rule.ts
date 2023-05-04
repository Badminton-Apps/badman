import { AssemblyValidationData, AssemblyOutput } from '../../../models';
import { Rule } from './_rule.base';

export class TeamSubEventRule extends Rule {
  async validate(assembly: AssemblyValidationData): Promise<AssemblyOutput> {
    const { teamIndex: subEvent } = assembly;

    if (!subEvent) {
      return {
        valid: false,
        errors: [
          {
            message: 'all.competition.team-enrollment.errors.no-subevent',
          },
        ],
      };
    }

    return {
      valid: true,
    };
  }
}
