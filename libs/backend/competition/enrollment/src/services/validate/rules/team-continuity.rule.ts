import { EnrollmentValidationData, EnrollmentValidationError, RuleResult } from "../../../models";
import { Rule } from "./_rule.base";

export class TeamContinuityRule extends Rule {
  async validate(enrollment: EnrollmentValidationData) {
    const results = [] as RuleResult[];

    for (const teamEnrollment of enrollment.teams) {
      if (!teamEnrollment?.team?.id) {
        continue;
      }

      const warnings = [] as EnrollmentValidationError[];

      if (teamEnrollment.isNewTeam && teamEnrollment.possibleOldTeamTeam) {
        warnings.push({
          message: "all.v1.entryTeamDrawer.validation.warnings.missing-continuity-link",
          params: {
            teamName: teamEnrollment.team.name,
            previousTeamName: teamEnrollment.possibleOldTeamTeam.name,
            previousTeamNumber: teamEnrollment.possibleOldTeamTeam.teamNumber,
          },
        });
      }

      results.push({
        teamId: teamEnrollment.team.id,
        warnings,
        valid: true,
      });
    }

    return results;
  }
}
