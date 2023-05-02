import { SubEventCompetition } from '@badman/backend-database';
import { SubEventTypeEnum } from '@badman/utils';
import {
  EnrollmentValidationData,
  EnrollmentValidationError,
  RuleResult,
} from '../../../models';
import { Rule } from './_rule.base';

export class TeamOrderRule extends Rule {
  async validate(enrollment: EnrollmentValidationData) {
    const results = [] as RuleResult[];

    // iterate over types of SubEventTypeEnum
    for (const type of Object.values(SubEventTypeEnum)) {
      // get all teams of this type
      const teams = enrollment.teams.filter(
        (team) => team.team.type === type && team.subEvent
      );

      // sort teams by teamIndex
      teams.sort((a, b) => a.teamIndex - b.teamIndex);

      // iterate over teams
      for (const teamEnrollment of teams) {
        const errors = [] as EnrollmentValidationError[];
        const warnings = [] as EnrollmentValidationError[];

        // find higher teams
        const higherTeams = teams?.filter(
          (t) => t.team.teamNumber < teamEnrollment.team.teamNumber
        );

        for (const higherTeam of higherTeams) {
          const subEventDiff = this.isFirstHigher(
            higherTeam.subEvent,
            teamEnrollment.subEvent
          );

          // if next team is in a better subEvent->level than the current team and the teamnumber is higher
          if (subEventDiff === 'lower') {
            errors.push({
              message: 'all.competition.team-enrollment.errors.team-order',
              params: {
                team: higherTeam.team,
              },
            });
          }

          if (
            subEventDiff == 'same' &&
            teamEnrollment.baseIndex < higherTeam.baseIndex
          ) {
            warnings.push({
              message:
                'all.competition.team-enrollment.errors.team-order-same-subevent',
              params: {
                team: higherTeam.team,
              },
            });
          }
        }

        results.push({
          teamId: teamEnrollment.team.id,
          errors,
          warnings,
          valid: errors.length === 0,
        });
      }
    }

    return results;
  }

  private isFirstHigher(
    subEvent1: SubEventCompetition,
    subEvent2: SubEventCompetition
  ) {
    const typeOrder = {
      NATIONAL: 1,
      LIGA: 2,
      PROV: 3,
    };

    if (subEvent1.id === subEvent2.id) {
      return 'same';
    }

    if (
      typeOrder[subEvent1.eventCompetition.type] <
      typeOrder[subEvent2.eventCompetition.type]
    ) {
      return 'better';
    } else if (
      typeOrder[subEvent1.eventCompetition.type] ===
      typeOrder[subEvent2.eventCompetition.type]
    ) {
      if (subEvent1.level < subEvent2.level) {
        return 'better';
      }
    }

    return 'lower';
  }
}
