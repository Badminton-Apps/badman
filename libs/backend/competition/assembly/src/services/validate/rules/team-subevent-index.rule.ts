import { AssemblyOutput, AssemblyValidationData, AssemblyValidationError } from '../../../models';
import { Rule } from './_rule.base';

export type TeamSubeventIndexRuleParams = {
  teamIndex: number;
  minIndex: number;
  maxIndex: number;
};
/**
 * Checks if the teamIndex is not lower then the allowed minIndex of the subevent
 */
export class TeamSubeventIndexRule extends Rule {
  static override readonly description = 'all.rules.team-assembly.team-subevent-index';
  async validate(assembly: AssemblyValidationData): Promise<AssemblyOutput> {
    const { teamIndex, subEvent, previousSeasonTeam, team } = assembly;

    if (!subEvent?.minBaseIndex) {
      throw new Error('Subevent is not defined');
    }

    // if team is degraded, it can have a lower index
    if (previousSeasonTeam?.entry?.standing?.faller) {
      return {
        valid: true,
      };
    }

    // We only need to check the first team, as else it shouldn't be lower then the base (see rule: team-base-index)
    if (team?.teamNumber !== 1) {
      return {
        valid: true,
      };
    }

    // if team index is lower then the min index, it's invalid
    if ((teamIndex ?? 0) < subEvent.minBaseIndex) {
      return {
        valid: false,
        errors: [
          {
            message: 'all.v1.teamFormation.errors.team-to-strong',
            params: {
              teamIndex: teamIndex,
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
