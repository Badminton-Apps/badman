import { Logger } from '@nestjs/common';
import {
  ChangeEncounterOutput,
  ChangeEncounterValidationData,
  ChangeEncounterValidationError,
} from '../../../models';
import { Rule } from './_rule.base';
import { getSeasonPeriod } from '@badman/utils';
import moment from 'moment';

export type DatePeriodRuleParams = {
  encounterId: string;
  date?: Date;
};

/**
 * Checks if all encounters are in the correct period
 */
export class DatePeriodRule extends Rule {
  private readonly logger = new Logger(DatePeriodRule.name);

  async validate(changeEncounter: ChangeEncounterValidationData): Promise<ChangeEncounterOutput> {
    const errors = [] as ChangeEncounterValidationError<DatePeriodRuleParams>[];
    const warnings = [] as ChangeEncounterValidationError<DatePeriodRuleParams>[];
    const valid = true;
    const { encountersSem1, encountersSem2, team, suggestedDates } = changeEncounter;
    const period = getSeasonPeriod(team.season);

    const err = encountersSem1
      .concat(encountersSem2)
      .map((encounter) => this.isBetween(encounter.date, [...period], encounter.id));

    for (const error of err) {
      if (error) {
        errors.push(error);
      }
    }

    // if we have suggested dates for the working encounter, we need to check if that date would give a warning
    if (suggestedDates && changeEncounter.workingencounterId) {
      const warns = suggestedDates.map((suggestedDate) =>
        this.isBetween(suggestedDate, [...period], changeEncounter.workingencounterId),
      );

      for (const warn of warns) {
        if (warn) {
          warnings.push(warn);
        }
      }
    }

    return {
      valid,
      errors,
      warnings,
    };
  }

  private isBetween(
    inputDate?: Date,
    period?: [string, string],
    encounterId?: string,
  ): ChangeEncounterValidationError<DatePeriodRuleParams> | null {
    if (!inputDate) {
      this.logger.warn('No date provided');
      return null;
    }

    if (!period) {
      this.logger.warn('No period provided');
      return null;
    }

    if (!encounterId) {
      this.logger.warn('No encounterId provided');
      return null;
    }

    const date = moment(inputDate);
    const isBetween = date.isBetween(period[0], period[1], 'day', '[]');

    if (!isBetween) {
      return {
        message: 'all.competition.change-encounter.errors.date-out-of-period',
        params: {
          encounterId,
          date: date.toDate(),
        },
      };
    }

    return null;
  }
}
