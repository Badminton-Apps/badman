import {
  EnrollmentValidationData,
  EnrollmentOutput,
  EnrollmentValidationError,
} from '../../../models';
import { Rule } from './_rule.base';

export class TeamSubeventIndexRule extends Rule {
  async validate(enrollment: EnrollmentValidationData): Promise<EnrollmentOutput> {
    const errors = [] as EnrollmentValidationError[];
    const valid: {
      teamId: string;
      valid: boolean;
    }[] = [];

    for (const {
      teamIndex: baseTeamIndex,
      subEvent,
      team,
    } of enrollment.teams) {
      let teamValid = true;
      if (baseTeamIndex < subEvent?.minBaseIndex) {
        teamValid = false;
        errors.push({
          message: 'all.competition.team-enrollment.errors.team-to-strong',
          params: {
            teamIndex: baseTeamIndex,
            minIndex: subEvent?.minBaseIndex,
            maxIndex: subEvent?.maxBaseIndex,
          },
        });
      }

      valid.push({
        teamId: team?.id,
        valid: teamValid,
      });
    }

    return {
      valid,
      errors,
    };
  }
}
