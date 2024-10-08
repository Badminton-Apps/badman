import { EncounterCompetition } from '@badman/backend-database';
import {
  EncounterValidationOutput,
  EncounterValidationData,
  EncounterValidationError,
} from '../../../models';
import { Rule } from './_rule.base';
import { Logger } from '@nestjs/common';
import e from 'express';

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

  async validate(changeEncounter: EncounterValidationData): Promise<EncounterValidationOutput> {
    const errors = [] as EncounterValidationError<TeamClubRuleParams>[];
    const warnings = [] as EncounterValidationError<TeamClubRuleParams>[];
    const valid = true;
    const { encountersSem1, encountersSem2, suggestedDates, encounter, season, semseter1, index } =
      changeEncounter;

    if (encounter.home?.clubId !== encounter.away?.clubId) {
      return {
        valid,
        errors,
        warnings,
      };
    }

    const error = this.isSameClubFirst(semseter1 ? encountersSem1 : encountersSem2, encounter);

    if (error) {
      errors.push({
        message: 'all.competition.change-encounter.errors.same-club',
        params: {
          encounterId: encounter.id,
        },
      });
    }

    // if we have suggested dates for the working encounter, we need to check if that date would give a warning
    if (suggestedDates && encounter.id) {
      if (index == -1) {
        throw new Error('Working encounter not found');
      }

      const encountersSemester1 = [...encountersSem1];
      const encountersSemester2 = [...encountersSem2];

      // remove the working encounter from the list
      const workingEncounter = {
        ...(semseter1
          ? encountersSemester1.splice(index, 1)[0]
          : encountersSemester2.splice(index, 1)[0]
        ).toJSON(),
      } as EncounterCompetition;

      for (const suggestedDate of suggestedDates) {
        const suggestedSemester1 = suggestedDate.date.getFullYear() === season;

        workingEncounter.date = suggestedDate.date;
        const encountersSemester = suggestedSemester1 ? encountersSemester1 : encountersSemester2;
        // remove the working encounter from the list

        const warn = this.isSameClubFirst(
          [...encountersSemester, workingEncounter],
          workingEncounter,
        );

        if (warn) {
          warnings.push({
            message: 'all.competition.change-encounter.errors.same-club',
            params: {
              encounterId: workingEncounter.id,
              date: suggestedDate.date,
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

  isSameClubFirst(encounters: EncounterCompetition[], encounter: EncounterCompetition) {
    // sorting by date this should be the first or second encounter within the respective teams
    const indexOfHome = encounters
      .slice()
      .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0))
      .filter((enc) => enc.homeTeamId === encounter.homeTeamId)
      .findIndex((enc) => enc.id === encounter.id);

    const indexOfAway = encounters
      .slice()
      .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0))
      .filter((enc) => enc.awayTeamId === encounter.homeTeamId)
      .findIndex((enc) => enc.id === encounter.id);

    if (indexOfHome < 2 || indexOfAway < 2) {
      return false;
    }

    return true;
  }
}
