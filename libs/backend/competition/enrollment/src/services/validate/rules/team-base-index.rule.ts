import {
  EnrollmentData,
  EnrollmentOutput,
  EnrollmentValidationError,
} from '../../../models';
import { Rule } from './_rule.base';

export class TeamBaseIndexRule extends Rule {
  async validate(enrollment: EnrollmentData): Promise<EnrollmentOutput> {
    const errors = [] as EnrollmentValidationError[];
    const valid: {
      teamId: string;
      valid: boolean;
    }[] = [];


    for (const { team, teamIndex, baseIndex } of enrollment.teams) {
      let teamValid = true;
      if (team.teamNumber != 1 && teamIndex < baseIndex) {
        teamValid = false;
        errors.push({
          message: 'all.competition.team-enrollment.errors.team-index',
          params: {
            teamIndex,
            baseIndex: baseIndex,
          },
        });
      } 

      valid.push({
        teamId: team.id,
        valid: teamValid,
      });
      
    }

    return {
      valid,
      errors,
    };
  }
}
