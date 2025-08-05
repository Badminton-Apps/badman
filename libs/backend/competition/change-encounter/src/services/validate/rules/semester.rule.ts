import { EncounterCompetition } from '@badman/backend-database';
import {
  EncounterValidationOutput,
  EncounterValidationData,
  EncounterValidationError,
} from '../../../models';
import { Rule } from './_rule.base';
import { Logger } from '@nestjs/common';

export type SemesterRuleParams = {
  encounterId: string;
  date?: Date;
  teamName?: string;
  semester?: string;
  season?: number;
  currentSemester?: string;
  suggestedSemester?: string;
};

/**
 * Checks if encounters against the same team are in a different semester
 */
export class SemesterRule extends Rule {
  static override readonly description = 'all.rules.change-encounter.semseter';

  private readonly logger = new Logger(SemesterRule.name);

  async validate(changeEncounter: EncounterValidationData): Promise<EncounterValidationOutput> {
    const errors = [] as EncounterValidationError<SemesterRuleParams>[];
    const warnings = [] as EncounterValidationError<SemesterRuleParams>[];
    const valid = true;
    const { encountersSem1, encountersSem2, suggestedDates, encounter, season, semseter1, index } =
      changeEncounter;

    const error = this.findEncounterInSemseter(
      semseter1 ? encountersSem1 : encountersSem2,
      encounter,
    );

    if (error) {
      errors.push({
        message: 'all.competition.change-encounter.errors.same-semester',
        params: {
          encounterId: encounter.id,
          teamName: encounter.home?.name || encounter.away?.name,
          semester: semseter1 ? 'first' : 'second',
          season: season,
        },
      });
    }

    // if we have suggested dates for the working encounter, we need to check if that date would give a warning
    if (suggestedDates && encounter) {
      for (const suggestedDate of suggestedDates) {
        const suggestedSemester1 = suggestedDate.date.getFullYear() === season;

        if (suggestedSemester1 != semseter1) {
          warnings.push({
            message: 'all.competition.change-encounter.errors.same-semester-date',
            params: {
              encounterId: encounter.id,
              date: suggestedDate.date,
              currentSemester: semseter1 ? 'first' : 'second',
              suggestedSemester: suggestedSemester1 ? 'first' : 'second',
              teamName: encounter.home?.name || encounter.away?.name,
            },
          });
        }
      }
    }

    return {
      valid,
      errors,
      warnings,
    };
  }
  findEncounterInSemseter(encounters: EncounterCompetition[], encounter: EncounterCompetition) {
    if (!encounters) {
      return false;
    }

    const sameEncounter = encounters.find(
      (e) => e.homeTeamId === encounter.awayTeamId && e.awayTeamId === encounter.homeTeamId,
    );

    return (sameEncounter && sameEncounter.id !== encounter.id) || false;
  }
}
