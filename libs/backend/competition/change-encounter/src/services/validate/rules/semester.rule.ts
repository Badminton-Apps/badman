import { EncounterCompetition } from '@badman/backend-database';
import {
  ChangeEncounterOutput,
  ChangeEncounterValidationData,
  ChangeEncounterValidationError,
} from '../../../models';
import { Rule } from './_rule.base';
import { Logger } from '@nestjs/common';

export type SemesterRuleParams = {
  encounterId: string;
  date?: Date;
};

/**
 * Checks if encounters against the same team are in a different semester
 */
export class SemesterRule extends Rule {
  private readonly logger = new Logger(SemesterRule.name);

  async validate(changeEncounter: ChangeEncounterValidationData): Promise<ChangeEncounterOutput> {
    const errors = [] as ChangeEncounterValidationError<SemesterRuleParams>[];
    const warnings = [] as ChangeEncounterValidationError<SemesterRuleParams>[];
    const valid = true;
    const { encountersSem1, encountersSem2, team, suggestedDates, workingencounterId, lowestYear } =
      changeEncounter;

    const errors1 = this.findEncountersInSameSemester(encountersSem1, team.id);
    const errors2 = this.findEncountersInSameSemester(encountersSem2, team.id);

    [errors1, errors2].forEach((err) => {
      for (const error of err) {
        errors.push({
          message: 'all.competition.change-encounter.errors.same-semester',
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

      this.logger.verbose(`Encounter found in semester ${semseter1 ? 1 : 2}`);
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
        this.logger.verbose(
          `Checking suggested date: ${suggestedDate.toISOString()}, new semester: ${suggestedSemester1 ? 'Semester 1' : 'Semester 2'}`,
        );

        encounter.date = suggestedDate;
        const encountersSemester = suggestedSemester1 ? encountersSemester1 : encountersSemester2;
        const warns = this.findEncountersInSameSemester(
          [...encountersSemester, encounter],
          team.id,
        );

        warns.forEach((warn) => {
          warnings.push({
            message: 'all.competition.change-encounter.errors.same-semester',
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
      warnings,
    };
  }
  findEncountersInSameSemester(encounters: EncounterCompetition[], currentTeamId: string) {
    const teamEncounterMap: Record<string, EncounterCompetition[]> = {};

    for (const encounter of encounters) {
      if (!encounter.id) {
        this.logger.warn(`Encounter has no id`);
        continue;
      }
      if (!encounter.home?.id || !encounter.away?.id) {
        this.logger.warn(`Encounter ${encounter.id} has no home or away team`);
        continue;
      }

      if (!teamEncounterMap[encounter.home.id]) {
        teamEncounterMap[encounter.home.id] = [];
      }

      if (!teamEncounterMap[encounter.away.id]) {
        teamEncounterMap[encounter.away.id] = [];
      }

      teamEncounterMap[encounter.home.id].push(encounter);
      teamEncounterMap[encounter.away.id].push(encounter);
    }

    const errors = [];

    for (const teamId in teamEncounterMap) {
      if (teamId == currentTeamId) {
        continue;
      }
      const encounters = teamEncounterMap[teamId];

      if (encounters.length > 1) {
        errors.push(encounters);
      }
    }

    return errors.flat();
  }
}
