import {
  AssemblyValidationData,
  AssemblyOutput,
  AssemblyValidationError,
} from '../../../models';
import { Rule } from './_rule.base';

export type TeamSubeventIndexRuleParams = {
  teamIndex: number;
  minIndex: number;
  maxIndex: number;
};

export class TeamSubeventIndexRule extends Rule {
  async validate(assembly: AssemblyValidationData): Promise<AssemblyOutput> {
    const { teamIndex: baseTeamIndex, subEvent } = assembly;

    if (!subEvent?.minBaseIndex) {
      throw new Error('Subevent is not defined');
    }

    if ((baseTeamIndex ?? 0) < subEvent.minBaseIndex) {
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
        ] as AssemblyValidationError<TeamSubeventIndexRuleParams>[],
      };
    }

    return {
      valid: true,
    };
  }
}
