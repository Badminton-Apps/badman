import { EncounterCompetition } from '@badman/backend-database';
import {
  ChangeEncounterOutput,
  ChangeEncounterValidationData,
  ChangeEncounterValidationError,
} from '../../../models';
import { Rule } from './_rule.base';
import { Logger } from '@nestjs/common';

export type TeamClubRuleParams = {
  encounterId: string;
  date?: Date;
};

/**
 * Checks if encounters against the same team are in a different semester
 */
export class TeamClubRule extends Rule {
  static override readonly description = 'all.rules.change-encounter.team-club';
  private readonly logger = new Logger(TeamClubRule.name);

  async validate(changeEncounter: ChangeEncounterValidationData): Promise<ChangeEncounterOutput> {
    const errors = [] as ChangeEncounterValidationError<TeamClubRuleParams>[];
    const warnings = [] as ChangeEncounterValidationError<TeamClubRuleParams>[];
    const valid = true;
    const { encountersSem1, encountersSem2, team, suggestedDates, workingencounterId, lowestYear } =
      changeEncounter;

    const errors1 = this.findIfSameClubIsFirst(encountersSem1, team.id);
    const errors2 = this.findIfSameClubIsFirst(encountersSem2, team.id);

    [errors1, errors2].forEach((err) => {
      for (const error of err) {
        errors.push({
          message: 'all.competition.change-encounter.errors.same-club',
          params: {
            encounterId: error.id,
          },
        });
      }
    });

    // if we have suggested dates for the working encounter, we need to check if that date would give a warning
    if (suggestedDates && workingencounterId) {
      const indexSem1 = encountersSem1.findIndex((r) => r.id === workingencounterId);
      const indexSem2 = encountersSem2.findIndex((r) => r.id === workingencounterId);
      const semseter1 = indexSem1 > -1;
      const index = semseter1 ? indexSem1 : indexSem2;

      if (index == -1) {
        throw new Error('Working encounter not found');
      }

      const encountersSemester1 = [...encountersSem1];
      const encountersSemester2 = [...encountersSem2];

      // remove the working encounter from the list
      const encounter = {
        ...(semseter1
          ? encountersSemester1.splice(index, 1)[0]
          : encountersSemester2.splice(index, 1)[0]
        ).toJSON(),
      } as EncounterCompetition;

      for (const suggestedDate of suggestedDates) {
        const suggestedSemester1 = suggestedDate.getFullYear() === lowestYear;

        encounter.date = suggestedDate;
        const encountersSemester = suggestedSemester1 ? encountersSemester1 : encountersSemester2;
        const warns = this.findIfSameClubIsFirst([...encountersSemester, encounter], team.id);

        warns.forEach((warn) => {
          warnings.push({
            message: 'all.competition.change-encounter.errors.same-club',
            params: {
              encounterId: warn.id,
              date: suggestedDate,
            },
          });
        });
      }
    }

    return {
      valid,
      errors,
    };
  }

  findIfSameClubIsFirst(encounters: EncounterCompetition[], currentTeamId: string) {
    const firstEnc = encounters[0];
    if (!firstEnc) {
      return [];
    }

    // pick the first encounter to get the current club id
    const currentClubId =
      firstEnc?.home?.id == currentTeamId ? firstEnc.home?.clubId : firstEnc.away?.clubId;

    if (!currentClubId) {
      return [];
    }

    const errors = [];
    let differentClubPassed = 0;
    for (const enc of encounters.sort(
      (a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0),
    )) {
      const otherClub = enc.home?.id == currentTeamId ? enc.away?.clubId : enc.home?.clubId;

      if (otherClub != currentClubId) {
        differentClubPassed++;
      } else if (differentClubPassed > 1) {
        this.logger.debug(`Found error for encounter ${enc.id}`);

        errors.push(enc);
      }
    }

    return errors;
  }
}
